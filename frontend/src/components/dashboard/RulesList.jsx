import { MessageSquare } from 'lucide-react';
import RuleCard from './RuleCard';

/**
 * RulesList renders a collection of RuleCards or an empty state layout.
 */
export default function RulesList({ rules = [], onEditRule, onDeleteRule }) {
  if (rules.length === 0) {
    return (
      <div className="card empty-state">
        <MessageSquare size={40} className="empty-icon" />
        <h3>No rules configured yet</h3>
        <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Click "Add New Rule" to configure your first automatic direct message reply!
        </p>
      </div>
    );
  }

  return (
    <div className="rules-list">
      {rules.map((rule, index) => (
        <RuleCard 
          key={index} 
          rule={rule} 
          index={index} 
          onEdit={onEditRule} 
          onDelete={onDeleteRule} 
        />
      ))}
    </div>
  );
}
