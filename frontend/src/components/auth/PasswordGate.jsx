import { useState } from 'react';

/**
 * PasswordGate component prompts the user for the dashboard password.
 * Designed to look like a clean UNIX terminal screen.
 */
export default function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onUnlock(password);
  };

  const handleContainerClick = () => {
    document.getElementById('pass-input')?.focus();
  };

  return (
    <div className="login-wrapper" onClick={handleContainerClick} style={{ cursor: 'text' }}>
      <div className="terminal-window" onClick={(e) => e.stopPropagation()}>
        {/* Title Bar resembling macOS/Linux Terminal window */}
        <div className="terminal-header">
          <div className="terminal-buttons">
            <div className="terminal-btn terminal-btn-red"></div>
            <div className="terminal-btn terminal-btn-yellow"></div>
            <div className="terminal-btn terminal-btn-green"></div>
          </div>
          <span className="terminal-title">guest@rexio: ~/unlock-console</span>
        </div>
        
        {/* Terminal screen text & input */}
        <div className="terminal-body">
          <div className="terminal-output">
            {`RexioOS v1.4.0 (tty1)

Welcome to the meta-auto-byrexio console.
Status: AUTHENTICATION_REQUIRED
Security policy: Enforced`}
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Simulated terminal run command */}
            <div className="terminal-line">
              <span className="terminal-prompt">
                <span className="terminal-prompt-prefix">guest@rexio</span>:~$ <span style={{ color: '#fafafa' }}>./unlock.sh</span>
              </span>
            </div>
            
            {/* Inline password input prompt */}
            <div className="terminal-line" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              <span style={{ color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>Enter passphrase:</span>
              <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center' }}>
                <input 
                  id="pass-input"
                  type="password" 
                  className="terminal-input" 
                  placeholder="" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  style={{ caretColor: 'var(--color-primary)' }}
                />
              </div>
            </div>

            {/* Instruction line */}
            <div className="terminal-output" style={{ marginTop: '20px', color: 'var(--text-dim)', fontSize: '12px' }}>
              [Press ENTER to execute unlock]
            </div>

            {/* Hidden submit button so form submits naturally on pressing Enter */}
            <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
          </form>
        </div>
      </div>
    </div>
  );
}
