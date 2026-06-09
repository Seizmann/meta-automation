use axum::{
    extract::{Query, State},
    http::{header, Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use axum::response::sse::{Event, Sse};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use std::convert::Infallible;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

// App configuration and shared state
struct AppConfig {
    verify_token: String,
    access_token: String,
    admin_api_key: String,
    http_client: reqwest::Client,
    // Add processed comments cache for deduplication
    processed_comments: tokio::sync::Mutex<Vec<String>>,
    // Add self-identities for self-reply loop protection
    page_id: Option<String>,
    instagram_business_account_id: Option<String>,
    // Add log broadcast sender
    log_tx: broadcast::Sender<String>,
}

struct LogBroadcastLayer {
    sender: broadcast::Sender<String>,
}

impl<S> tracing_subscriber::Layer<S> for LogBroadcastLayer
where
    S: tracing::Subscriber,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        let mut log_line = String::new();
        let metadata = event.metadata();
        
        log_line.push_str(&format!("[{}] ", metadata.level()));
        
        struct MsgVisitor<'a>(&'a mut String);
        impl<'a> tracing::field::Visit for MsgVisitor<'a> {
            fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
                if field.name() == "message" {
                    use std::fmt::Write;
                    let _ = write!(self.0, "{:?}", value);
                }
            }
        }
        event.record(&mut MsgVisitor(&mut log_line));
        
        let cleaned_line = if log_line.starts_with('[') {
            let prefix_end = log_line.find(']').unwrap_or(0) + 2;
            if prefix_end < log_line.len() {
                let prefix = &log_line[..prefix_end];
                let msg = log_line[prefix_end..].trim_matches('"');
                format!("{}{}", prefix, msg)
            } else {
                log_line
            }
        } else {
            log_line
        };
        
        let _ = self.sender.send(cleaned_line);
    }
}

#[derive(Deserialize)]
struct LogQuery {
    api_key: String,
}

async fn get_logs(
    Query(query): Query<LogQuery>,
    State(state): State<Arc<AppConfig>>,
) -> impl IntoResponse {
    if query.api_key != state.admin_api_key {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    let rx = state.log_tx.subscribe();
    let stream = BroadcastStream::new(rx)
        .map(|item| {
            match item {
                Ok(log) => Event::default().data(log),
                Err(_) => Event::default().data("Log stream lag error"),
            }
        })
        .map(Ok::<_, Infallible>);

    Sse::new(stream)
        .keep_alive(axum::response::sse::KeepAlive::default())
        .into_response()
}


// Meta Webhook verification query parameters (GET /webhook)
#[derive(Deserialize, Debug)]
struct VerifyQuery {
    #[serde(rename = "hub.mode")]
    mode: String,
    #[serde(rename = "hub.verify_token")]
    verify_token: String,
    #[serde(rename = "hub.challenge")]
    challenge: String,
}

// Rules structure from mappings.json
#[derive(Deserialize, Serialize, Clone, Debug)]
struct MappingRule {
    /// Post/Media ID. "all" or None means match any post.
    media_id: Option<String>,
    /// Case-insensitive keyword to look for in comment. None or empty means match any comment.
    keyword: Option<String>,
    /// The message (including links) to DM the commenter.
    reply_text: String,
    /// Optional public reply to write on the user's comment.
    #[serde(default)]
    public_reply_text: Option<String>,
}

// Generic Webhook Payload from Meta
#[derive(Deserialize, Debug)]
struct WebhookPayload {
    object: String,
    entry: Vec<WebhookEntry>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct WebhookEntry {
    #[serde(default)]
    id: String,
    #[serde(default)]
    time: i64,
    changes: Option<Vec<WebhookChange>>,
}

#[derive(Deserialize, Debug)]
struct WebhookChange {
    field: String,
    value: serde_json::Value,
}

// Specific structs to parse Instagram Comment Value
#[derive(Deserialize, Debug)]
struct InstagramCommentValue {
    id: String,
    text: Option<String>,
    from: Option<InstagramFrom>,
    media: Option<InstagramMedia>,
}

#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct InstagramFrom {
    id: String,
    username: Option<String>,
}

#[derive(Deserialize, Debug)]
struct InstagramMedia {
    id: String,
}

// Specific structs to parse Facebook Feed Comment Value
#[allow(dead_code)]
#[derive(Deserialize, Debug)]
struct FacebookFeedValue {
    item: String,
    verb: String,
    comment_id: String,
    post_id: String,
    sender_id: String,
    sender_name: Option<String>,
    message: Option<String>,
}

#[tokio::main]
async fn main() {
    let (log_tx, _) = broadcast::channel::<String>(100);
    let log_tx_clone = log_tx.clone();

    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,instragram_automation=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .with(LogBroadcastLayer { sender: log_tx_clone })
        .init();

    // Load .env file if it exists
    if let Err(e) = dotenvy::dotenv() {
        warn!(".env file not found or could not be loaded: {}. Falling back to system environment variables.", e);
    }

    // Read config from environment variables
    let verify_token = std::env::var("META_VERIFY_TOKEN")
        .unwrap_or_else(|_| "my_super_secret_token_123".to_string());
    let access_token = std::env::var("META_ACCESS_TOKEN")
        .unwrap_or_else(|_| "".to_string());
    let admin_api_key = std::env::var("ADMIN_API_KEY")
        .unwrap_or_else(|_| "admin_secret_token_123".to_string());
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    if access_token.is_empty() {
        warn!("META_ACCESS_TOKEN is not set! Responses will fail to send to Meta Graph API.");
    }
    if admin_api_key == "admin_secret_token_123" {
        warn!("Using default ADMIN_API_KEY 'admin_secret_token_123'. Please change this in production.");
    }

    // Ensure mappings.json exists
    ensure_mappings_file_exists().await;

    let http_client = reqwest::Client::new();
    let (page_id, instagram_business_account_id) = fetch_meta_ids(&http_client, &access_token).await;

    // Create shared state
    let config = Arc::new(AppConfig {
        verify_token,
        access_token,
        admin_api_key,
        http_client,
        processed_comments: tokio::sync::Mutex::new(Vec::new()),
        page_id,
        instagram_business_account_id,
        log_tx,
    });

    // Create CORS middleware layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([
            header::CONTENT_TYPE,
            header::HeaderName::from_static("x-api-key"),
        ]);

    // Setup routes
    let app = Router::new()
        .route("/webhook", get(verify_webhook).post(handle_webhook))
        .route("/health", get(health_check))
        .route("/api/rules", get(get_rules).post(save_rules))
        .route("/api/logs", get(get_logs))
        .layer(cors)
        .with_state(config);

    // Bind and start the server
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Starting server on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

/// Simple health check endpoint
async fn health_check() -> &'static str {
    "OK"
}

/// Helper function to check custom API authentication
fn authorize_request(headers: &axum::http::HeaderMap, expected_key: &str) -> bool {
    if expected_key.is_empty() {
        return true;
    }
    if let Some(key) = headers.get("x-api-key") {
        if let Ok(key_str) = key.to_str() {
            return key_str == expected_key;
        }
    }
    false
}

/// GET /api/rules endpoint
async fn get_rules(
    headers: axum::http::HeaderMap,
    State(state): State<Arc<AppConfig>>,
) -> impl IntoResponse {
    if !authorize_request(&headers, &state.admin_api_key) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    match fs::read_to_string("mappings.json").await {
        Ok(content) => (
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json")],
            content,
        )
            .into_response(),
        Err(e) => {
            error!("Failed to read mappings.json: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Failed to read mappings").into_response()
        }
    }
}

/// POST /api/rules endpoint
async fn save_rules(
    headers: axum::http::HeaderMap,
    State(state): State<Arc<AppConfig>>,
    Json(rules): Json<Vec<MappingRule>>,
) -> impl IntoResponse {
    if !authorize_request(&headers, &state.admin_api_key) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized").into_response();
    }

    let json_data = match serde_json::to_string_pretty(&rules) {
        Ok(data) => data,
        Err(e) => {
            error!("Failed to serialize rules: {}", e);
            return (StatusCode::BAD_REQUEST, "Invalid rules data").into_response();
        }
    };

    if let Err(e) = fs::write("mappings.json", json_data).await {
        error!("Failed to write mappings.json: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, "Failed to save rules").into_response()
    } else {
        info!("Rules updated successfully via Admin API.");
        (StatusCode::OK, "Rules saved").into_response()
    }
}

/// Meta Webhook Verification Handler (GET /webhook)
/// Meta sends a GET request to verify our webhook URL when setting it up.
async fn verify_webhook(
    Query(query): Query<VerifyQuery>,
    State(state): State<Arc<AppConfig>>,
) -> impl IntoResponse {
    info!("Received webhook verification request: {:?}", query);

    if query.mode == "subscribe" && query.verify_token == state.verify_token {
        info!("Webhook verified successfully!");
        (StatusCode::OK, query.challenge).into_response()
    } else {
        warn!("Webhook verification failed. Token mismatch or invalid mode.");
        (StatusCode::FORBIDDEN, "Verification failed").into_response()
    }
}

/// Webhook Event Handler (POST /webhook)
/// Receives notifications from Facebook / Instagram when events occur.
async fn handle_webhook(
    State(state): State<Arc<AppConfig>>,
    Json(payload): Json<WebhookPayload>,
) -> impl IntoResponse {
    info!("Received webhook payload. Object type: '{}'", payload.object);

    // Process entries
    for entry in payload.entry {
        if let Some(changes) = entry.changes {
            for change in changes {
                let state_clone = Arc::clone(&state);
                let object_type = payload.object.clone();
                tokio::spawn(async move {
                    if object_type == "instagram" && change.field == "comments" {
                        if let Ok(comment_val) = serde_json::from_value::<InstagramCommentValue>(change.value.clone()) {
                            process_instagram_comment(&state_clone, comment_val).await;
                        } else {
                            warn!("Failed to parse Instagram comment change value: {:?}", change.value);
                        }
                    } else if object_type == "page" && change.field == "feed" {
                        if let Ok(feed_val) = serde_json::from_value::<FacebookFeedValue>(change.value.clone()) {
                            process_facebook_comment(&state_clone, feed_val).await;
                        } else {
                            warn!("Failed to parse Facebook feed change value: {:?}", change.value);
                        }
                    } else {
                        info!("Ignored unhandled field '{}' for object '{}'", change.field, object_type);
                    }
                });
            }
        }
    }

    StatusCode::OK
}

/// Process Instagram Comment notifications
async fn process_instagram_comment(state: &AppConfig, comment: InstagramCommentValue) {
    // 1. Deduplicate by checking if comment ID was recently processed
    {
        let mut processed = state.processed_comments.lock().await;
        if processed.contains(&comment.id) {
            info!("Instagram comment {} was already processed recently. Ignoring duplicate webhook event.", comment.id);
            return;
        }
        processed.push(comment.id.clone());
        if processed.len() > 200 {
            processed.remove(0);
        }
    }

    // 2. Ignore self-comments (comments/replies sent by our own Instagram business account)
    if let Some(ref from) = comment.from {
        if let Some(ref self_ig_id) = state.instagram_business_account_id {
            if from.id == *self_ig_id {
                info!("Ignoring Instagram self-comment/reply (ID {}) to prevent infinite reply loop.", comment.id);
                return;
            }
        }
    }

    let comment_text = comment.text.as_deref().unwrap_or("");
    let media_id = comment.media.as_ref().map(|m| m.id.as_str()).unwrap_or("");
    let sender_username = comment.from.as_ref().and_then(|f| f.username.as_deref()).unwrap_or("unknown");

    info!(
        "Instagram Comment - ID: {}, User: @{}, Media ID: '{}', Text: '{}'",
        comment.id, sender_username, media_id, comment_text
    );

    // Find the matching reply rule based on media ID and comment text
    if let Some(rule) = match_reply(media_id, comment_text).await {
        info!("Match found! Sending Instagram private reply to comment ID: {}", comment.id);
        if let Err(e) = send_instagram_private_reply(&state.http_client, &state.access_token, &comment.id, &rule.reply_text).await {
            error!("Error sending Instagram private reply: {:?}", e);
        }

        // Send public comment reply if configured
        if let Some(ref public_reply) = rule.public_reply_text {
            if !public_reply.trim().is_empty() {
                info!("Sending Instagram public reply to comment ID: {}", comment.id);
                if let Err(e) = send_instagram_public_reply(&state.http_client, &state.access_token, &comment.id, public_reply).await {
                    error!("Error sending Instagram public reply: {:?}", e);
                }
            }
        }
    } else {
        info!("No keyword or media rule matched for Instagram comment '{}'", comment_text);
    }
}

/// Process Facebook Comment notifications
async fn process_facebook_comment(state: &AppConfig, comment: FacebookFeedValue) {
    // We only care about new comment additions
    if comment.item != "comment" || comment.verb != "add" {
        return;
    }

    // 1. Deduplicate by checking if comment ID was recently processed
    {
        let mut processed = state.processed_comments.lock().await;
        if processed.contains(&comment.comment_id) {
            info!("Facebook comment {} was already processed recently. Ignoring duplicate webhook event.", comment.comment_id);
            return;
        }
        processed.push(comment.comment_id.clone());
        if processed.len() > 200 {
            processed.remove(0);
        }
    }

    // 2. Ignore self-comments (comments/replies sent by our own Facebook page)
    if let Some(ref self_page_id) = state.page_id {
        if comment.sender_id == *self_page_id {
            info!("Ignoring Facebook self-comment/reply (ID {}) to prevent infinite reply loop.", comment.comment_id);
            return;
        }
    }

    let comment_text = comment.message.as_deref().unwrap_or("");
    let post_id = &comment.post_id;
    let sender_name = comment.sender_name.as_deref().unwrap_or("unknown");

    info!(
        "Facebook Comment - ID: {}, User: {}, Post ID: '{}', Text: '{}'",
        comment.comment_id, sender_name, post_id, comment_text
    );

    // Find the matching reply rule based on post ID and comment text
    if let Some(rule) = match_reply(post_id, comment_text).await {
        info!("Match found! Sending Facebook private reply to comment ID: {}", comment.comment_id);
        if let Err(e) = send_facebook_private_reply(&state.http_client, &state.access_token, &comment.comment_id, &rule.reply_text).await {
            error!("Error sending Facebook private reply: {:?}", e);
        }

        // Send public comment reply if configured
        if let Some(ref public_reply) = rule.public_reply_text {
            if !public_reply.trim().is_empty() {
                info!("Sending Facebook public reply to comment ID: {}", comment.comment_id);
                if let Err(e) = send_facebook_public_reply(&state.http_client, &state.access_token, &comment.comment_id, public_reply).await {
                    error!("Error sending Facebook public reply: {:?}", e);
                }
            }
        }
    } else {
        info!("No keyword or post rule matched for Facebook comment '{}'", comment_text);
    }
}

/// Match comment text and media/post ID against mappings.json rules.
async fn match_reply(media_id: &str, comment_text: &str) -> Option<MappingRule> {
    let mappings_content = match fs::read_to_string("mappings.json").await {
        Ok(content) => content,
        Err(e) => {
            warn!("Failed to read mappings.json: {}. Using default fallback.", e);
            return None;
        }
    };

    let rules: Vec<MappingRule> = match serde_json::from_str(&mappings_content) {
        Ok(r) => r,
        Err(e) => {
            error!("Failed to parse mappings.json: {}. Please check syntax.", e);
            return None;
        }
    };

    let normalized_comment = comment_text.to_lowercase();

    // Priority 1: Specific media_id AND specific keyword
    for rule in &rules {
        if let (Some(m_id), Some(kw)) = (&rule.media_id, &rule.keyword) {
            if m_id != "all" && !m_id.is_empty() && m_id == media_id && !kw.is_empty() && normalized_comment.contains(&kw.to_lowercase()) {
                return Some(rule.clone());
            }
        }
    }

    // Priority 2: Specific media_id ONLY (matches any text on this specific post)
    for rule in &rules {
        if let Some(m_id) = &rule.media_id {
            let has_no_kw = rule.keyword.is_none() || rule.keyword.as_deref().unwrap_or("").is_empty();
            if m_id != "all" && !m_id.is_empty() && m_id == media_id && has_no_kw {
                return Some(rule.clone());
            }
        }
    }

    // Priority 3: Global keyword ONLY (matches "all" or missing media_id with matching keyword)
    for rule in &rules {
        if let Some(kw) = &rule.keyword {
            if !kw.is_empty() {
                let is_global = rule.media_id.is_none() || rule.media_id.as_deref().unwrap_or("all") == "all" || rule.media_id.as_deref().unwrap_or("").is_empty();
                if is_global && normalized_comment.contains(&kw.to_lowercase()) {
                    return Some(rule.clone());
                }
            }
        }
    }

    // Priority 4: Global fallback (media_id is "all"/None/empty, keyword is None/empty)
    for rule in &rules {
        let is_global_media = rule.media_id.is_none() || rule.media_id.as_deref().unwrap_or("all") == "all" || rule.media_id.as_deref().unwrap_or("").is_empty();
        let is_global_kw = rule.keyword.is_none() || rule.keyword.as_deref().unwrap_or("").is_empty();
        if is_global_media && is_global_kw {
            return Some(rule.clone());
        }
    }

    None
}

/// Send Instagram Private Reply to Comment via Graph API
async fn send_instagram_private_reply(
    client: &reqwest::Client,
    access_token: &str,
    comment_id: &str,
    reply_text: &str,
) -> Result<(), reqwest::Error> {
    let url = "https://graph.facebook.com/v19.0/me/messages";

    #[derive(Serialize)]
    struct Recipient {
        comment_id: String,
    }

    #[derive(Serialize)]
    struct Message {
        text: String,
    }

    #[derive(Serialize)]
    struct RequestBody {
        recipient: Recipient,
        message: Message,
    }

    let body = RequestBody {
        recipient: Recipient {
            comment_id: comment_id.to_string(),
        },
        message: Message {
            text: reply_text.to_string(),
        },
    };

    let res = client
        .post(url)
        .bearer_auth(access_token)
        .json(&body)
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully sent Instagram private reply to comment {}", comment_id);
    } else {
        error!(
            "Failed to send Instagram private reply. Status: {}, Response: {}",
            status, text
        );
    }

    Ok(())
}

/// Send Facebook Private Reply to Comment via Graph API
async fn send_facebook_private_reply(
    client: &reqwest::Client,
    access_token: &str,
    comment_id: &str,
    reply_text: &str,
) -> Result<(), reqwest::Error> {
    let url = format!("https://graph.facebook.com/v19.0/{}/private_replies", comment_id);

    #[derive(Serialize)]
    struct RequestBody {
        message: String,
    }

    let body = RequestBody {
        message: reply_text.to_string(),
    };

    let res = client
        .post(&url)
        .bearer_auth(access_token)
        .json(&body)
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully sent Facebook private reply to comment {}", comment_id);
    } else {
        error!(
            "Failed to send Facebook private reply. Status: {}, Response: {}",
            status, text
        );
    }

    Ok(())
}

/// Send Instagram Public Reply to Comment via Graph API
async fn send_instagram_public_reply(
    client: &reqwest::Client,
    access_token: &str,
    comment_id: &str,
    public_reply_text: &str,
) -> Result<(), reqwest::Error> {
    let url = format!("https://graph.facebook.com/v19.0/{}/replies", comment_id);

    let res = client
        .post(&url)
        .query(&[("message", public_reply_text)])
        .bearer_auth(access_token)
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully sent Instagram public reply to comment {}", comment_id);
    } else {
        error!(
            "Failed to send Instagram public reply. Status: {}, Response: {}",
            status, text
        );
    }

    Ok(())
}

/// Send Facebook Public Reply to Comment via Graph API
async fn send_facebook_public_reply(
    client: &reqwest::Client,
    access_token: &str,
    comment_id: &str,
    public_reply_text: &str,
) -> Result<(), reqwest::Error> {
    let url = format!("https://graph.facebook.com/v19.0/{}/comments", comment_id);

    let res = client
        .post(&url)
        .query(&[("message", public_reply_text)])
        .bearer_auth(access_token)
        .send()
        .await?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();

    if status.is_success() {
        info!("Successfully sent Facebook public reply to comment {}", comment_id);
    } else {
        error!(
            "Failed to send Facebook public reply. Status: {}, Response: {}",
            status, text
        );
    }

    Ok(())
}

/// Generates a default mappings.json file if one doesn't exist
async fn ensure_mappings_file_exists() {
    let path = std::path::Path::new("mappings.json");
    if !path.exists() {
        let default_rules = vec![
            MappingRule {
                media_id: Some("all".to_string()),
                keyword: Some("link".to_string()),
                reply_text: "Hey there! Thanks for your comment. Here is your requested link: https://github.com/google/antigravity".to_string(),
                public_reply_text: None,
            },
            MappingRule {
                media_id: Some("all".to_string()),
                keyword: Some("info".to_string()),
                reply_text: "Hello! Here is the details/information you asked for: https://example.com/info".to_string(),
                public_reply_text: None,
            },
            MappingRule {
                media_id: Some("1234567890123456".to_string()), // Example post ID
                keyword: None,
                reply_text: "This is a custom auto-reply for comments on this specific post! Check out: https://example.com/special".to_string(),
                public_reply_text: None,
            }
        ];

        let json_data = serde_json::to_string_pretty(&default_rules).unwrap();
        if let Err(e) = fs::write(path, json_data).await {
            error!("Failed to write default mappings.json: {}", e);
        } else {
            info!("Created default mappings.json file.");
        }
    }
}

/// Fetch Page ID and Instagram Business Account ID from Meta on startup
async fn fetch_meta_ids(client: &reqwest::Client, access_token: &str) -> (Option<String>, Option<String>) {
    if access_token.is_empty() {
        return (None, None);
    }
    
    let url = "https://graph.facebook.com/v19.0/me?fields=id,instagram_business_account";
    
    #[derive(Deserialize)]
    struct IgAccount {
        id: String,
    }
    
    #[derive(Deserialize)]
    struct MeResponse {
        id: String,
        instagram_business_account: Option<IgAccount>,
    }
    
    match client.get(url).bearer_auth(access_token).send().await {
        Ok(res) => {
            if let Ok(data) = res.json::<MeResponse>().await {
                let page_id = Some(data.id);
                let ig_id = data.instagram_business_account.map(|ig| ig.id);
                info!("Fetched Meta IDs - Page ID: {:?}, Instagram Account ID: {:?}", page_id, ig_id);
                return (page_id, ig_id);
            }
        }
        Err(e) => {
            error!("Failed to fetch Meta IDs on startup: {:?}", e);
        }
    }
    (None, None)
}
