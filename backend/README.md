# Instagram & Facebook Comment Auto-DM Automation (Rust & Axum)

<p align="center">
  <img src="../frontend/public/meta-auto-rexio.svg" alt="meta-auto-byrexio Logo" width="80" height="80" />
</p>

A lightweight, super-fast, and low-resource Rust web server built using [Axum](https://github.com/tokio-rs/axum) and [Tokio](https://github.com/tokio-rs/tokio). This server automatically sends private direct messages (DMs) to users who comment on your Instagram Professional posts/reels or Facebook Page posts based on configurable keyword rules.

---

## Features

- **Blazing Fast & Low Resource:** Built with Rust, utilizing a tiny amount of RAM and CPU (perfect for cheap VPS/Coolify instances).
- **Instagram Professional Support:** Automatically sends private replies using Meta's standard Messaging API when users comment on your Reels or Posts.
- **Facebook Page Support:** Supports Facebook Page feed comment private replies.
- **Hot-Reloadable Mappings:** Update rules in `mappings.json` on the fly without restarting the server!
- **Multi-Stage Docker Support:** Extremely small Docker image size for deployment.

---

## Configuration Files

### 1. `.env` Configuration
Copy `.env.example` to `.env` and fill in your values:
```env
META_VERIFY_TOKEN=my_super_secret_token_123
META_ACCESS_TOKEN=your_meta_access_token_here
PORT=8080
RUST_LOG=info,instragram_automation=debug
```

### 2. `mappings.json` Configuration
Configure your reply rules in `mappings.json`:
```json
[
  {
    "media_id": "all",
    "keyword": "link",
    "reply_text": "Hey! Thanks for commenting. Here is the link you requested: https://github.com/google/antigravity"
  },
  {
    "media_id": "all",
    "keyword": "info",
    "reply_text": "Hello! Here is the details/information you asked for: https://example.com/info"
  },
  {
    "media_id": "1234567890123456",
    "keyword": "",
    "reply_text": "Custom reply for any comment on this specific media ID: 1234567890123456!"
  }
]
```
- **`media_id`**: Set to `"all"` or omit to match comments on any media. Set to a specific ID (e.g. `"1234567890123456"`) to only trigger for comments on that specific post/reel.
- **`keyword`**: The keyword to look for (case-insensitive search). Set to empty `""` or omit to trigger on any comment.
- **`reply_text`**: The text that will be sent via DM to the user.

---

## Local Development

1. Run the server locally:
   ```bash
   cargo run
   ```
2. The server will start on `http://localhost:8080`.
3. To expose the local server to the internet for testing Meta webhooks, use a tool like **ngrok**:
   ```bash
   ngrok http 8080
   ```
   Copy the HTTPS URL provided by ngrok (e.g., `https://xxxx.ngrok-free.app`). Your webhook URL will be: `https://xxxx.ngrok-free.app/webhook`.

---

## Meta Developer Setup (Facebook/Instagram Portal)

### 1. Create a Meta Developer App
1. Go to the [Meta App Dashboard](https://developers.facebook.com/).
2. Click **Create App**. Select **Other** -> **Business** (or **Consumer** if needed) as the app type.
3. Link the app to your Facebook Business Manager Account.

### 2. Add Products
Add **Instagram Graph API** and **Messenger API / Webhooks** products to your app.

### 3. Set Up Webhooks
1. In the left menu, select **Webhooks**.
2. Under "Select a Subscription", choose **Instagram** (or **Page** if setting up Facebook Page).
3. Click **Configure a Webhook** / **Edit Subscription**:
   - **Callback URL:** `https://your-domain.com/webhook` (e.g., your Coolify deployment URL or ngrok HTTPS URL).
   - **Verify Token:** The value of `META_VERIFY_TOKEN` from your `.env` (e.g., `my_super_secret_token_123`).
4. Click **Verify and Save**.
5. Once verified, subscribe to the following fields:
   - For Instagram: Subscribe to **`comments`**.
   - For Facebook Page: Subscribe to **`feed`**.

### 4. Get Access Token & Permissions
For the auto-responder to work, you need to generate a Page Access Token with the following permissions:
- `instagram_basic`
- `instagram_manage_messages`
- `pages_manage_metadata`
- `pages_read_engagement`
- `pages_show_list`

You can use the **Graph API Explorer** to generate a long-lived access token, and save it in your `.env` file as `META_ACCESS_TOKEN`.

---

## Deploying on Coolify / Docker

1. Create a new application in Coolify.
2. Select **Source** as your Git Repository.
3. Select **Build Pack** as `Dockerfile`.
4. In Coolify's Environment Variables setting, add:
   - `META_VERIFY_TOKEN`
   - `META_ACCESS_TOKEN`
   - `PORT` (e.g. `8080`)
5. **Persistent storage (optional):** To prevent losing modifications to `mappings.json` on new deployments, mount a persistent volume to `/app` or directly bind `/app/mappings.json`.
