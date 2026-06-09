import { Globe, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react';

/**
 * Renders details of a single rule card in the dashboard.
 */
export default function RuleCard({ rule, index, onEdit, onDelete }) {
  const isGlobalPost = rule.media_id === 'all' || !rule.media_id;
  const isGlobalComment = !rule.keyword;

  return (
    <div className="card rule-card">
      <div className="rule-info">
        <div className="rule-badges">
          <span className="badge badge-media">
            <Globe size={10} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline' }} />
            Post ID: {isGlobalPost ? 'ANY POST' : rule.media_id}
          </span>
          <span className={`badge ${isGlobalComment ? 'badge-global' : 'badge-keyword'}`}>
            <LinkIcon size={10} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline' }} />
            Keyword: {isGlobalComment ? 'ANY COMMENT' : `"${rule.keyword}"`}
          </span>
        </div>
        
        <div className="rule-text-container">
          <span className="rule-text-label">DM Response:</span>
          {rule.reply_text}
        </div>
        
        {rule.public_reply_text && (
          <div className="rule-text-container" style={{ marginTop: '8px' }}>
            <span className="rule-text-label">Public Comment Reply:</span>
            <span className="rule-text-italic">"{rule.public_reply_text}"</span>
          </div>
        )}
      </div>

      <div className="rule-actions">
        <button 
          onClick={() => onEdit(index)} 
          className="btn btn-secondary btn-sm btn-w-auto" 
          style={{ padding: '8px' }}
          aria-label="Edit rule"
        >
          <Edit2 size={13} />
        </button>
        <button 
          onClick={() => onDelete(index)} 
          className="btn btn-danger btn-sm btn-w-auto" 
          style={{ padding: '8px' }}
          aria-label="Delete rule"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
