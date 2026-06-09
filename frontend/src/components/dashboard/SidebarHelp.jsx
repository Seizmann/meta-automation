import { Info } from 'lucide-react';

/**
 * SidebarHelp provides guidance and configuration settings for automation rules.
 */
export default function SidebarHelp({ backendUrl = '', rulesCount = 0 }) {
  const getMaskedUrl = (url) => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      const parts = parsed.hostname.split('.');
      if (parts.length > 1) {
        parts[0] = parts[0].substring(0, 3) + '***';
        return `${parsed.protocol}//${parts.join('.')}`;
      }
      return url;
    } catch {
      return 'https://***';
    }
  };

  return (
    <div className="sidebar-panel">
      {/* Help Guide */}
      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Configuration Help</h3>
        
        <div className="info-item">
          <Info size={14} className="info-icon" />
          <div>
            <div className="info-title">Specific Post ID matching</div>
            <div className="info-desc">
              Provide the unique numerical ID of an Instagram Reel or Post to reply only to comments on that specific media. Set to <strong>"all"</strong> to monitor comments globally on your profile.
            </div>
          </div>
        </div>

        <div className="info-item">
          <Info size={14} className="info-icon" />
          <div>
            <div className="info-title">Keyword matching</div>
            <div className="info-desc">
              Matches your keyword anywhere in the user's comment (case-insensitive). For example, a keyword of "link" matches "Send link", "Link please", or "LINK!". Leave blank to reply to any comment.
            </div>
          </div>
        </div>

        <div className="info-item">
          <Info size={14} className="info-icon" />
          <div>
            <div className="info-title">Private Replies API Limit</div>
            <div className="info-desc">
              Meta Graph API allows sending one Private Reply DM per comment. Standard policy requires matching keywords to avoid spam flags.
            </div>
          </div>
        </div>
      </div>

      {/* System Settings Status */}
      <div className="card sidebar-settings-card">
        <h3 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 600 }}>System Settings</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Endpoint:</span> {getMaskedUrl(backendUrl)}/webhook
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Active Mappings:</span> {rulesCount}
          </div>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Security:</span> Token Authorization Enabled
          </div>
        </div>
      </div>
    </div>
  );
}
