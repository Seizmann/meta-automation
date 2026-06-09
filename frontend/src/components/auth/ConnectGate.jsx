import { useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * ConnectGate component prompts the user for backend URL and credentials.
 * Designed to look like a clean UNIX terminal setup script screen.
 */
export default function ConnectGate({ initialUrl = '', initialApiKey = '', isConnecting, onConnect }) {
  const [url, setUrl] = useState(initialUrl);
  const [apiKey, setApiKey] = useState(initialApiKey);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url || !apiKey) return;
    onConnect(url, apiKey);
  };

  const handleContainerClick = () => {
    document.getElementById('url-input')?.focus();
  };

  return (
    <div className="login-wrapper" onClick={handleContainerClick} style={{ cursor: 'text' }}>
      <div className="terminal-window" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        {/* Title Bar resembling macOS/Linux Terminal window */}
        <div className="terminal-header">
          <div className="terminal-buttons">
            <div className="terminal-btn terminal-btn-red"></div>
            <div className="terminal-btn terminal-btn-yellow"></div>
            <div className="terminal-btn terminal-btn-green"></div>
          </div>
          <span className="terminal-title">admin@rexio: ~/connect-vps</span>
        </div>
        
        {/* Terminal screen text & inputs */}
        <div className="terminal-body">
          <div className="terminal-output">
            {`Session state: AUTHENTICATED
Initializing configuration parameters...
Ready to link auto-responder console to the Rust Axum responder server.`}
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Running command */}
            <div className="terminal-line">
              <span className="terminal-prompt">
                <span className="terminal-prompt-prefix">admin@rexio</span>:~$ <span style={{ color: '#fafafa' }}>./setup-tunnel.sh</span>
              </span>
            </div>
            
            {/* Inline VPS URL input */}
            <div className="terminal-line" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              <span style={{ color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>Enter VPS Webhook URL:</span>
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center' }}>
                <input 
                  id="url-input"
                  type="url" 
                  className="terminal-input" 
                  placeholder="https://api.yourvps.com" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  style={{ caretColor: 'var(--color-primary)' }}
                />
              </div>
            </div>
            
            {/* Inline API Key input */}
            <div className="terminal-line" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              <span style={{ color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>Enter Admin API Key:</span>
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="password" 
                  className="terminal-input" 
                  placeholder="••••••••••••••••" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  style={{ caretColor: 'var(--color-primary)' }}
                />
              </div>
            </div>

            {/* Instruction line or connection status */}
            <div className="terminal-output" style={{ marginTop: '24px', color: 'var(--text-dim)', fontSize: '12px' }}>
              {isConnecting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  [Tunneling connection to Rust server...]
                </span>
              ) : (
                <span>[Press ENTER to establish link]</span>
              )}
            </div>

            {/* Hidden submit button so form submits naturally on pressing Enter */}
            <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
          </form>
        </div>
      </div>
    </div>
  );
}
