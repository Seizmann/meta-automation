import { useState } from 'react';
import Modal from '../common/Modal';

/**
 * Modal dialog form for creating or editing automation rules.
 */
export default function RuleFormModal({ isOpen, onClose, rule = null, onSave }) {
  const [mediaId, setMediaId] = useState(rule ? (rule.media_id || 'all') : 'all');
  const [keyword, setKeyword] = useState(rule ? (rule.keyword || '') : '');
  const [replyText, setReplyText] = useState(rule ? (rule.reply_text || '') : '');
  const [publicReplyText, setPublicReplyText] = useState(rule ? (rule.public_reply_text || '') : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    onSave({
      media_id: mediaId.trim() === '' ? 'all' : mediaId.trim(),
      keyword: keyword.trim() === '' ? null : keyword.trim(),
      reply_text: replyText.trim(),
      public_reply_text: publicReplyText.trim() === '' ? null : publicReplyText.trim()
    });
  };

  const isEditing = rule !== null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? 'Edit Reply Rule' : 'Create New Reply Rule'}
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Reel / Post ID (Media ID)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. 18029348123985 or 'all'" 
            value={mediaId}
            onChange={(e) => setMediaId(e.target.value)}
            required
          />
          <small className="form-help">
            Use "all" to apply this rule to comments on all posts/reels.
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Trigger Keyword</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. 'link' or 'info' (leave blank for any comment)" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">DM Text Response</label>
          <textarea 
            className="form-input form-textarea" 
            placeholder="Type the response message including URLs (e.g. 'Hey! Thanks for commenting. Here is the link: https://example.com')" 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Public Comment Reply (Optional)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="e.g. 'DM check koro! 📩' (leave blank to only send private DM)" 
            value={publicReplyText}
            onChange={(e) => setPublicReplyText(e.target.value)}
          />
          <small className="form-help">
            If configured, the bot will also reply to the comment publicly.
          </small>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-w-auto">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-w-auto">
            Save Rule
          </button>
        </div>
      </form>
    </Modal>
  );
}
