import { LogOut } from 'lucide-react';
import BrandHeader from '../common/BrandHeader';

/**
 * Dashboard top navigation header.
 */
export default function Header({ onDisconnect }) {
  return (
    <header className="dashboard-header">
      <BrandHeader size="sm" showSubtitle={true} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="status-badge">
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
          Connected
        </div>
        <button 
          onClick={onDisconnect} 
          className="btn btn-secondary btn-sm btn-w-auto" 
          style={{ gap: '6px', padding: '6px 12px' }}
        >
          <LogOut size={13} />
          Disconnect
        </button>
      </div>
    </header>
  );
}
