import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2, Terminal } from 'lucide-react';

/**
 * LiveLogs component streams logs in real-time from the backend SSE route.
 * Renders inside a clean developer terminal window.
 */
export default function LiveLogs({ backendUrl, apiKey }) {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (!isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  // Handle SSE Connection
  useEffect(() => {
    if (!backendUrl || !apiKey) return;

    const connectLogs = () => {
      // Create EventSource URL with auth query parameter
      const sseUrl = `${backendUrl}/api/logs?api_key=${apiKey}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setLogs((prev) => [...prev, `[SYSTEM] Stream tunnel established successfully.`]);
      };

      es.onmessage = (event) => {
        if (isPaused) return;
        setLogs((prev) => {
          const updated = [...prev, event.data];
          // Limit logs to keep last 200 items in memory
          if (updated.length > 200) {
            return updated.slice(updated.length - 200);
          }
          return updated;
        });
      };

      es.onerror = () => {
        setIsConnected(false);
        setLogs((prev) => [...prev, `[SYSTEM ERROR] Connection lost. Attempting to reconnect...`]);
        es.close();
        // Retry connection after 5 seconds
        setTimeout(connectLogs, 5000);
      };
    };

    connectLogs();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [backendUrl, apiKey, isPaused]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  return (
    <div className="card" style={{ marginTop: '24px', padding: 0, overflow: 'hidden' }}>
      {/* Terminal Window Frame */}
      <div className="terminal-header" style={{ padding: '8px 16px' }}>
        <div className="terminal-buttons">
          <div className="terminal-btn terminal-btn-red"></div>
          <div className="terminal-btn terminal-btn-yellow"></div>
          <div className="terminal-btn terminal-btn-green"></div>
        </div>
        <span className="terminal-title">live-logs - tail -f</span>
        
        {/* Terminal Controls */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', zIndex: 10 }}>
          <button 
            onClick={togglePause} 
            className="btn btn-secondary btn-sm btn-w-auto"
            style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title={isPaused ? "Resume log stream" : "Pause log stream"}
          >
            {isPaused ? <Play size={10} /> : <Pause size={10} />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <button 
            onClick={handleClearLogs} 
            className="btn btn-danger btn-sm btn-w-auto"
            style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Clear screen logs"
          >
            <Trash2 size={10} />
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div 
        className="terminal-body" 
        style={{ 
          background: '#050506', 
          height: '240px', 
          overflowY: 'auto', 
          fontSize: '12px',
          padding: '16px',
          fontFamily: 'var(--font-mono)'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)' }}>
            <Terminal size={14} />
            <span>Awaiting system events...</span>
          </div>
        ) : (
          logs.map((log, index) => {
            // Check status log lines for highlights
            let logColor = '#e4e4e7';
            if (log.startsWith('[ERROR]')) logColor = '#f87171'; // Red for errors
            else if (log.startsWith('[WARN]')) logColor = '#fbbf24';  // Amber for warnings
            else if (log.startsWith('[SYSTEM]')) logColor = '#60a5fa'; // Soft blue for system info
            else if (log.startsWith('[SYSTEM ERROR]')) logColor = '#ef4444'; // Red system error

            return (
              <div 
                key={index} 
                style={{ 
                  color: logColor, 
                  whiteSpace: 'pre-wrap', 
                  marginBottom: '4px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.01)'
                }}
              >
                {log}
              </div>
            );
          })
        )}
        
        {/* Blinking green prompt cursor at the bottom if connected */}
        {isConnected && !isPaused && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <span style={{ color: '#10b981' }}>guest@rexio:~$</span>
            <span className="terminal-cursor"></span>
          </div>
        )}

        {/* Anchor for auto-scroll */}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
