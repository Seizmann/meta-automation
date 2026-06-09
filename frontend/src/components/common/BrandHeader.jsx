import { MessageSquare } from 'lucide-react';

/**
 * BrandHeader component displays the app logo and title.
 * Supports "sm" (dashboard header) and "lg" (login gates) sizes.
 */
export default function BrandHeader({ size = 'sm', showSubtitle = false }) {
  const isLarge = size === 'lg';

  return (
    <div 
      className="logo-container" 
      style={{ 
        justifyContent: isLarge ? 'center' : 'flex-start',
        marginBottom: isLarge ? '24px' : '0'
      }}
    >
      <div className={isLarge ? 'logo-icon-wrapper-large' : 'logo-icon-wrapper'}>
        <MessageSquare size={isLarge ? 24 : 18} color="#ffffff" />
      </div>
      <div>
        <h1 className={isLarge ? 'logo-text-large' : 'logo-text'}>
          meta-auto-byrexio{showSubtitle && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> Dashboard</span>}
        </h1>
      </div>
    </div>
  );
}
