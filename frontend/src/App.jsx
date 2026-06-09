import { useState, useEffect } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import Toast from './components/common/Toast';
import PasswordGate from './components/auth/PasswordGate';
import ConnectGate from './components/auth/ConnectGate';
import Header from './components/dashboard/Header';
import RulesList from './components/dashboard/RulesList';
import SidebarHelp from './components/dashboard/SidebarHelp';
import RuleFormModal from './components/dashboard/RuleFormModal';
import ConfirmDialog from './components/common/ConfirmDialog';
import LiveLogs from './components/dashboard/LiveLogs';
import { fetchRules, saveRules } from './services/api';

function App() {
  const envPassword = import.meta.env.VITE_DASHBOARD_PASSWORD || '';
  const defaultUrl = import.meta.env.VITE_DEFAULT_BACKEND_URL || '';
  const defaultKey = import.meta.env.VITE_DEFAULT_API_KEY || '';

  // Authorization States
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('insta_backend_url') || defaultUrl;
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('insta_api_key') || defaultKey;
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Password Protection States
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (!envPassword) return true;
    return sessionStorage.getItem('dashboard_unlocked') === 'true';
  });

  // Data States
  const [rules, setRules] = useState([]);
  
  // UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRuleIndex, setCurrentRuleIndex] = useState(null); // null means adding new rule
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // Toast Notification State
  const [toast, setToast] = useState(null);

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const testConnection = async (url, key) => {
    setIsConnecting(true);
    try {
      const data = await fetchRules(url, key);
      setRules(data);
      setIsAuthorized(true);
      setBackendUrl(url);
      setApiKey(key);
      localStorage.setItem('insta_backend_url', url);
      localStorage.setItem('insta_api_key', key);
      showToast('Successfully connected to backend!');
    } catch (error) {
      console.error(error);
      if (error.message.includes('401')) {
        showToast('Unauthorized! Check your ADMIN_API_KEY.', 'error');
      } else {
        showToast('Could not connect to backend server. Make sure it is running and CORS is enabled.', 'error');
      }
      setIsAuthorized(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Load saved credentials and test connection on startup or unlock
  useEffect(() => {
    if (isUnlocked && backendUrl && apiKey) {
      // Defer to avoid calling setState synchronously within the effect body
      Promise.resolve().then(() => {
        testConnection(backendUrl, apiKey);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnlocked]);

  const handlePasswordUnlock = (password) => {
    if (password === envPassword) {
      sessionStorage.setItem('dashboard_unlocked', 'true');
      setIsUnlocked(true);
      showToast('Dashboard unlocked!');
    } else {
      showToast('Incorrect password!', 'error');
    }
  };

  const handleConnect = (url, key) => {
    testConnection(url, key);
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('dashboard_unlocked');
    localStorage.removeItem('insta_backend_url');
    localStorage.removeItem('insta_api_key');
    setIsUnlocked(false);
    setIsAuthorized(false);
    setRules([]);
    showToast('Logged out.');
  };

  // Sync rules to backend
  const handleSaveRule = async (ruleData) => {
    let updatedRules = [...rules];
    if (currentRuleIndex !== null) {
      updatedRules[currentRuleIndex] = ruleData;
    } else {
      updatedRules.push(ruleData);
    }

    try {
      await saveRules(backendUrl, apiKey, updatedRules);
      setRules(updatedRules);
      showToast('Rules synced and saved successfully!');
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast('Failed to save rules: Network Error.', 'error');
    }
  };

  const handleDeleteRule = (index) => {
    setConfirmDialog({
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this rule? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        const updatedRules = rules.filter((_, i) => i !== index);
        try {
          await saveRules(backendUrl, apiKey, updatedRules);
          setRules(updatedRules);
          showToast('Rule deleted successfully!');
        } catch (error) {
          console.error(error);
          showToast('Failed to delete rule: Network Error.', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  const openEditModal = (index) => {
    setCurrentRuleIndex(index);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setCurrentRuleIndex(null);
    setIsModalOpen(true);
  };

  const handleExportRules = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(rules, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', 'meta_automation_rules.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Rules exported successfully!');
    } catch (error) {
      console.error(error);
      showToast('Failed to export rules.', 'error');
    }
  };

  const handleImportRules = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (!Array.isArray(importedData)) {
          showToast('Invalid file format. Rules must be a JSON array.', 'error');
          return;
        }

        const isValid = importedData.every(rule => 
          typeof rule === 'object' && rule !== null && 'reply_text' in rule
        );

        if (!isValid) {
          showToast('Invalid rules structure. Each rule must have a reply_text.', 'error');
          return;
        }

        const formattedRules = importedData.map(rule => ({
          media_id: rule.media_id || 'all',
          keyword: rule.keyword || null,
          reply_text: rule.reply_text,
          public_reply_text: rule.public_reply_text || null
        }));

        setConfirmDialog({
          title: 'Import Rules',
          message: `Importing will overwrite your existing ${rules.length} rules with ${formattedRules.length} imported rules. Proceed?`,
          confirmText: 'Import',
          cancelText: 'Cancel',
          isDestructive: false,
          onConfirm: async () => {
            try {
              await saveRules(backendUrl, apiKey, formattedRules);
              setRules(formattedRules);
              showToast(`Successfully imported ${formattedRules.length} rules!`);
            } catch (error) {
              console.error(error);
              showToast('Failed to import rules: Network Error.', 'error');
            } finally {
              setConfirmDialog(null);
            }
          },
          onCancel: () => setConfirmDialog(null)
        });
      } catch (err) {
        console.error(err);
        showToast('Failed to parse JSON file.', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const triggerImportInput = () => {
    document.getElementById('import-rules-input')?.click();
  };

  return (
    <div className="app-container">
      <Toast toast={toast} />

      {!isUnlocked ? (
        <PasswordGate onUnlock={handlePasswordUnlock} />
      ) : !isAuthorized ? (
        <ConnectGate 
          initialUrl={backendUrl} 
          initialApiKey={apiKey} 
          isConnecting={isConnecting}
          onConnect={handleConnect} 
        />
      ) : (
        <>
          <Header onDisconnect={handleDisconnect} />

          <div className="dashboard-grid">
            <div>
              <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <h2 className="section-title">Automation Rules</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleExportRules} 
                    className="btn btn-secondary btn-sm btn-w-auto" 
                    style={{ gap: '6px', padding: '6px 12px' }}
                  >
                    <Download size={13} />
                    Export
                  </button>
                  <button 
                    onClick={triggerImportInput} 
                    className="btn btn-secondary btn-sm btn-w-auto" 
                    style={{ gap: '6px', padding: '6px 12px' }}
                  >
                    <Upload size={13} />
                    Import
                  </button>
                  <button 
                    onClick={openAddModal} 
                    className="btn btn-primary btn-sm btn-w-auto" 
                    style={{ gap: '6px', padding: '6px 12px' }}
                  >
                    <Plus size={13} />
                    Add Rule
                  </button>
                  <input 
                    type="file" 
                    id="import-rules-input" 
                    accept=".json" 
                    onChange={handleImportRules} 
                    style={{ display: 'none' }} 
                  />
                </div>
              </div>

              <RulesList 
                rules={rules} 
                onEditRule={openEditModal} 
                onDeleteRule={handleDeleteRule} 
              />

              <LiveLogs backendUrl={backendUrl} apiKey={apiKey} />
            </div>

            <SidebarHelp 
              backendUrl={backendUrl} 
              rulesCount={rules.length} 
            />
          </div>

          {isModalOpen && (
            <RuleFormModal 
              key={currentRuleIndex !== null ? `edit-${currentRuleIndex}` : 'add'}
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)} 
              rule={currentRuleIndex !== null ? rules[currentRuleIndex] : null}
              onSave={handleSaveRule}
            />
          )}

          <ConfirmDialog 
            isOpen={confirmDialog !== null}
            title={confirmDialog?.title}
            message={confirmDialog?.message}
            confirmText={confirmDialog?.confirmText}
            cancelText={confirmDialog?.cancelText}
            isDestructive={confirmDialog?.isDestructive}
            onConfirm={confirmDialog?.onConfirm}
            onCancel={confirmDialog?.onCancel}
          />
        </>
      )}
    </div>
  );
}

export default App;
