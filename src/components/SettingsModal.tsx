import React, { useState, useEffect } from 'react';
import { getActiveDbMode, setActiveDbMode } from '../lib/firebase';
import { 
  getGoogleSheetsUrl, 
  setGoogleSheetsUrl, 
  isGoogleSheetsSyncEnabled, 
  setGoogleSheetsSyncEnabled, 
  testGoogleSheetConnection, 
  syncAllTasksToGoogleSheet,
  activateCloudTrigger,
  triggerCloudReminderCheck,
  DEFAULT_SHEETS_URL,
  RECOMMENDED_APPS_SCRIPT_CODE
} from '../lib/sheets';
import { Task } from '../types';
import { X, Key, Shield, HelpCircle, HardDrive, Database, Info, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Send, Code, Copy, Check, Trash2, Bell, Clock, Radio, Palette, Eye, EyeOff } from 'lucide-react';
import { getTelegramConfig, setTelegramConfig, testTelegramConnection, DEFAULT_TG_BOT_TOKEN, DEFAULT_TG_CHAT_ID } from '../lib/telegram';
import { checkTaskAdvanceAlert, getCambodiaDateStr } from '../lib/dateUtils';

interface SettingsModalProps {
  onClose: () => void;
  onRefreshState: () => void;
  tasks?: Task[];
  onOpenThemeColors?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onRefreshState, tasks = [], onOpenThemeColors }) => {
  const [apiKey, setApiKey] = useState('');
  const [dbMode, setDbMode] = useState<'user' | 'workspace'>('user');
  
  // Google Sheets state
  const [sheetsUrl, setSheetsUrlState] = useState('');
  const [sheetsEnabled, setSheetsEnabledState] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [sheetsFeedback, setSheetsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // 24/7 Cloud Background Worker state
  const [workerStatus, setWorkerStatus] = useState<{
    active: boolean;
    service: string;
    timezone: string;
    cambodiaToday: string;
    cambodiaTomorrow: string;
    lastCheck: string;
    monitoredTasksCount: number;
    pendingDueTomorrowCount: number;
    totalRemindersSent: number;
  } | null>(null);
  const [checkingWorker, setCheckingWorker] = useState(false);
  const [workerFeedback, setWorkerFeedback] = useState<string | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<string | null>(null);
  const [activatingCloudTrigger, setActivatingCloudTrigger] = useState(false);
  const [cloudTriggerFeedback, setCloudTriggerFeedback] = useState<string | null>(null);

  // Telegram Bot Token and Chat ID State
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [showTgToken, setShowTgToken] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(RECOMMENDED_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const fetchWorkerStatus = () => {
    fetch('/api/reminders/status')
      .then(res => res.json())
      .then(data => setWorkerStatus(data))
      .catch(() => {});
  };

  const handleResetTelegramConfig = () => {
    setTgBotToken(DEFAULT_TG_BOT_TOKEN);
    setTgChatId(DEFAULT_TG_CHAT_ID);
    setTelegramConfig(DEFAULT_TG_BOT_TOKEN, DEFAULT_TG_CHAT_ID);
    setTelegramFeedback('បានកំណត់ Telegram Bot Token & Chat ID ទៅ Default វិញ');
  };

  const handleActivateCloudTrigger = async () => {
    setActivatingCloudTrigger(true);
    setCloudTriggerFeedback(null);
    try {
      const res = await activateCloudTrigger();
      setCloudTriggerFeedback(res.message || 'បានបើកដំណើរការ Cloud Trigger ២៤/៧ រួចរាល់!');
    } catch (err: any) {
      setCloudTriggerFeedback(`❌ បរាជ័យ៖ ${err?.message || 'Error'}`);
    } finally {
      setActivatingCloudTrigger(false);
    }
  };

  const handleTriggerWorkerCheck = async () => {
    setCheckingWorker(true);
    setWorkerFeedback(null);
    try {
      // Also trigger Google Cloud reminder check
      try {
        const cloudRes = await triggerCloudReminderCheck();
        if (cloudRes.message) {
          setWorkerFeedback(cloudRes.message);
        }
      } catch (_) {}

      let handledByServer = false;
      try {
        const res = await fetch('/api/reminders/check-now', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setWorkerFeedback(prev => prev ? `${prev} | Server: ${data.checked} checked, ${data.sent} sent` : `បានត្រួតពិនិត្យ ${data.checked} កិច្ចការ, បានផ្ញើសាររំលឹក ${data.sent} កិច្ចការ (Server Worker)។`);
            fetchWorkerStatus();
            handledByServer = true;
          }
        }
      } catch (_) {}

      if (!handledByServer) {
        let dueCount = 0;
        for (const t of tasks) {
          if (t.status === 'Pending' && t.date) {
            const check = checkTaskAdvanceAlert(t.date, t.time);
            if (check.shouldAlert) {
              dueCount++;
            }
          }
        }
        const todayKh = getCambodiaDateStr(0);
        const tomorrowKh = getCambodiaDateStr(1);
        setWorkerFeedback(prev => prev ? `${prev} | ក្នុង Browser: ពិនិត្យឃើញ ${dueCount} កិច្ចការត្រូវរំលឹក` : `បានត្រួតពិនិត្យ ${tasks.length} កិច្ចការ (GitHub Pages Cloud Mode)៖ រកឃើញ ${dueCount} កិច្ចការដែលត្រូវរំលឹកមុន ២៤ ម៉ោង ឬ ១ ថ្ងៃមុន (ថ្ងៃនេះ៖ ${todayKh}, ថ្ងៃស្អែក៖ ${tomorrowKh})។`);
      }
    } catch (err: any) {
      setWorkerFeedback(`បរាជ័យ: ${err?.message || 'Error'}`);
    } finally {
      setCheckingWorker(false);
    }
  };

  const handleTestTelegramServer = async () => {
    setTestingTelegram(true);
    setTelegramFeedback(null);
    try {
      // Save current input to localStorage
      setTelegramConfig(tgBotToken, tgChatId);
      // Run browser direct test
      const res = await testTelegramConnection(tgBotToken, tgChatId);
      setTelegramFeedback(res.message);
    } catch (err: any) {
      setTelegramFeedback(`❌ បរាជ័យក្នុងការតភ្ជាប់៖ ${err?.message || 'Error'}`);
    } finally {
      setTestingTelegram(false);
    }
  };

  useEffect(() => {
    setApiKey(localStorage.getItem('taskflow_gemini_api_key') || '');
    setDbMode(getActiveDbMode());
    setSheetsUrlState(getGoogleSheetsUrl());
    setSheetsEnabledState(isGoogleSheetsSyncEnabled());
    const tg = getTelegramConfig();
    setTgBotToken(tg.botToken);
    setTgChatId(tg.chatId);
    fetchWorkerStatus();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('taskflow_gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('taskflow_gemini_api_key');
    }
    setActiveDbMode(dbMode);
    
    // Save Google Sheets configuration
    setGoogleSheetsUrl(sheetsUrl);
    setGoogleSheetsSyncEnabled(sheetsEnabled);

    // Save Telegram Bot configuration
    setTelegramConfig(tgBotToken, tgChatId);

    // Dispatch a state recalculation in parent App
    onRefreshState();
    onClose();
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setSheetsFeedback(null);
    setGoogleSheetsUrl(sheetsUrl);
    try {
      const res = await testGoogleSheetConnection();
      if (res.success) {
        setSheetsFeedback({
          type: 'success',
          message: 'Connected to Google Sheet backend successfully!'
        });
      } else {
        setSheetsFeedback({
          type: 'error',
          message: res.error || 'Failed to connect to Google Sheet'
        });
      }
    } catch (err: any) {
      setSheetsFeedback({
        type: 'error',
        message: err?.message || 'Connection failed'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSyncAllToSheet = async () => {
    if (tasks.length === 0) {
      setSheetsFeedback({
        type: 'success',
        message: 'No tasks to sync (0 active tasks).'
      });
      return;
    }
    setSyncLoading(true);
    setSheetsFeedback(null);
    setGoogleSheetsUrl(sheetsUrl);
    try {
      const res = await syncAllTasksToGoogleSheet(tasks);
      if (res.success) {
        setSheetsFeedback({
          type: 'success',
          message: `Successfully synchronized ${tasks.length} task(s) to Google Sheets!`
        });
      } else {
        setSheetsFeedback({
          type: 'error',
          message: res.error || 'Sync operation failed'
        });
      }
    } catch (err: any) {
      setSheetsFeedback({
        type: 'error',
        message: err?.message || 'Sync failed'
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleResetSheetsUrl = () => {
    setSheetsUrlState(DEFAULT_SHEETS_URL);
    setGoogleSheetsUrl(DEFAULT_SHEETS_URL);
    setSheetsFeedback({
      type: 'success',
      message: 'Reset to default Google Sheets Web App URL'
    });
  };

  const handleClearKey = () => {
    setApiKey('');
    localStorage.removeItem('taskflow_gemini_api_key');
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-[999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#112240] border border-gray-250 dark:border-gold-500/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative custom-scrollbar">
        <button 
          onClick={onClose} 
          className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gold-500 cursor-pointer transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display font-bold text-lg text-gray-800 dark:text-gold-500 mb-2 flex items-center gap-2 select-none">
          <Database className="w-5 h-5 text-gold-500 animate-pulse" />
          <span>Sync & AI System Settings</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-300 font-mono mb-6 leading-relaxed">
          Manage your cloud-based database synchronization for multi-device operations and customize Gemini AI integrations securely.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section: Custom Theme Colors Shortcut */}
          {onOpenThemeColors && (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gold-500 flex items-center gap-1.5">
                    <span>កែសម្រួលពណ៌ប្រព័ន្ធ (Theme Colors - ថ្ងៃ / យប់)</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                    រើសពណ៌តាមចិត្តសម្រាប់អក្សរ, ផ្ទៃ Dashboard, ស៊ុម Frame និងប៊ូតុង
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenThemeColors();
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>កែពណ៌</span>
              </button>
            </div>
          )}

          {/* Section: Cloud Sync Database Config */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 select-none">
              <Shield className="w-3.5 h-3.5" />
              <span>Multi-Device Database Synchronization</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Option 1: User's recruitmen-2cc3d project */}
              <label className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                dbMode === 'user' 
                  ? 'border-gold-500 bg-gold-500/5 dark:bg-gold-500/10 ring-1 ring-gold-500/20' 
                  : 'border-gray-200 dark:border-slate-800 bg-gray-50/50 hover:bg-gold-500/5'
              }`}>
                <input 
                  type="radio" 
                  name="db_mode" 
                  value="user" 
                  checked={dbMode === 'user'} 
                  onChange={() => setDbMode('user')}
                  className="sr-only"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full flex items-center justify-center border ${dbMode === 'user' ? 'border-gold-500 bg-gold-500' : 'border-gray-300'}`}>
                      {dbMode === 'user' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                    </span>
                    <h5 className="text-xs font-bold text-gray-800 dark:text-gold-500">Custom Cloud Project</h5>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono mt-2">
                    ID: <b>recruitmen-2cc3d</b>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                    Syncs tasks directly into your custom external Firestore instance.
                  </p>
                </div>
              </label>

              {/* Option 2: Auto-provisioned safe workspace project */}
              <label className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                dbMode === 'workspace' 
                  ? 'border-gold-500 bg-gold-500/5 dark:bg-gold-500/10 ring-1 ring-gold-500/20' 
                  : 'border-gray-200 dark:border-slate-800 bg-gray-50/50 hover:bg-gold-500/5'
              }`}>
                <input 
                  type="radio" 
                  name="db_mode" 
                  value="workspace" 
                  checked={dbMode === 'workspace'} 
                  onChange={() => setDbMode('workspace')}
                  className="sr-only"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full flex items-center justify-center border ${dbMode === 'workspace' ? 'border-gold-500 bg-gold-500' : 'border-gray-300'}`}>
                      {dbMode === 'workspace' && <span className="w-1 h-1 bg-white rounded-full"></span>}
                    </span>
                    <h5 className="text-xs font-bold text-gray-800 dark:text-gold-500">Workspace Database</h5>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono mt-2">
                    ID: <b>ai-studio-applet-webapp</b>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                    Secure developer sandbox pre-configured by Google Cloud Run.
                  </p>
                </div>
              </label>
            </div>
            
            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-2 text-[10px] text-gray-500">
              <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <b>Synchronicity Notice:</b> Standard Firestore limits require your custom database to allow open reads/writes for unauthenticated operations (e.g. testing) unless you configure Firebase Authentication Rules inside recruitmen-2cc3d. The pre-provisioned workspace option is fully open by default.
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-slate-850"></div>

          {/* Section: Google Sheets Backend Synchronization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 select-none">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Google Sheets Backend (មូលដ្ឋានទិន្នន័យ Google Sheet)</span>
              </h4>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={sheetsEnabled}
                  onChange={(e) => setSheetsEnabledState(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Auto-sync</span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-semibold text-gray-500">
                  Google Apps Script Web App URL (តំណភ្ជាប់ Web App)
                </label>
                <button
                  type="button"
                  onClick={handleResetSheetsUrl}
                  className="text-[10px] text-gold-600 dark:text-gold-500 hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
              <input 
                type="text" 
                value={sheetsUrl}
                onChange={(e) => setSheetsUrlState(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec" 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-slate-900/50 dark:border-slate-800 dark:text-white font-mono text-[11px]"
              />
              <p className="text-[9px] text-gray-400 mt-1 leading-normal">
                Connected to your deployed Google Apps Script that stores and updates tasks in your Google Sheet spreadsheet.
              </p>
            </div>

            {/* Test & Sync All Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testLoading || !sheetsUrl}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllToSheet}
                disabled={syncLoading || !sheetsUrl}
                className="px-3 py-1.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-600 dark:text-gold-400 border border-gold-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {syncLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Sync All Tasks ({tasks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScriptCode(!showScriptCode)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
              >
                <Code className="w-3.5 h-3.5 text-blue-500" />
                <span>{showScriptCode ? 'Hide Apps Script Code' : 'Apps Script Code'}</span>
              </button>
            </div>

            {/* Auto-Delete Assurance Banner */}
            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-start gap-2 text-[10px] text-gray-600 dark:text-gray-300">
              <Trash2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Auto-Delete from Google Sheet សកម្មជានិច្ច:
                </p>
                <p className="mt-0.5 text-gray-500 dark:text-gray-400 leading-normal">
                  រាល់ពេលលោកអ្នកលុបកិច្ចការ (Delete Task) ក្នុងប្រព័ន្ធ ប្រព័ន្ធនឹងផ្ញើពាក្យបញ្ជា <b>action: "delete"</b> ជាមួយលេខសម្គាល់ (ID) និងឈ្មោះកិច្ចការ (Task Title) ដើម្បីលុបជួរដេកនោះចេញពី Google Sheet ដោយស្វ័យប្រវត្តិ។
                </p>
              </div>
            </div>

            {/* Expandable Apps Script Code Box */}
            {showScriptCode && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-200 text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    Google Apps Script v4.0 (3 Sheets: Daily, Monthly, Yearly)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="text-[10px] leading-relaxed max-h-48 overflow-y-auto text-slate-300 p-1">
                  {RECOMMENDED_APPS_SCRIPT_CODE}
                </pre>
                <p className="text-[9px] text-slate-400 font-sans leading-normal pt-1 border-t border-slate-800">
                  💡 <b>ណែនាំ៖</b> កូដ v4.0 នេះបែងចែក Sheet ជា ៣ (<b>Daily Tasks</b>, <b>Monthly Tasks</b>, <b>Yearly Tasks</b>) ដោយស្វ័យប្រវត្តិ ព្រមទាំងមាន Columns <b>N (លំដាប់លេខរៀង)</b>, <b>Task (ឈ្មោះភារកិច្ច)</b>, <b>Date</b>, <b>Time</b>, <b>Priority</b>, <b>Status</b>។ សូមចម្លងទៅដាក់ក្នុង <b>script.google.com</b> រួចចុច <b>Run &gt; setupThreeTaskSheets</b> ម្តង រួចចុច <b>Deploy &gt; New deployment</b> (ឬ Manage deployments &gt; New version)!
                </p>
              </div>
            )}

            {/* Feedback notification banner */}
            {sheetsFeedback && (
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                sheetsFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                {sheetsFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{sheetsFeedback.message}</span>
              </div>
            )}
          </div>

          <div className="h-px bg-gray-200 dark:bg-slate-850"></div>

          {/* Section: Telegram Bot & 24/7 Autonomous Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 select-none">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>Telegram Bot & ការរំលឹកស្វ័យប្រវត្តិ (២៤ ម៉ោង ឬ ១ ថ្ងៃមុន)</span>
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Active 24/7</span>
              </span>
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl space-y-3 text-xs">
              <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed">
                <Radio className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-400">
                    ការជូនដំណឹងមុន ១ ថ្ងៃ ឬ ២៤ ម៉ោងមុនពេលមកដល់នៃភារកិច្ច
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-normal">
                    ប្រព័ន្ធត្រួតពិនិត្យកាលបរិច្ឆេទ និងពេលវេលាជាក់ស្ដែងតាមម៉ោងកម្ពុជា (Asia/Phnom_Penh, UTC+7)។ រាល់កិច្ចការដែលត្រូវបំពេញនៅថ្ងៃស្អែក ឬសល់រយៈពេលក្រោម ២៤ ម៉ោងមុនពេលមកដល់ ប្រព័ន្ធនឹងផ្ញើសេចក្តីរំលឹកស្វ័យប្រវត្តិទៅកាន់ Telegram របស់លោក កាហ្វា។
                  </p>
                </div>
              </div>

              {/* Bot Token Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-semibold text-gray-500">
                    Telegram Bot Token (ទទួលបានពី @BotFather)
                  </label>
                  <button
                    type="button"
                    onClick={handleResetTelegramConfig}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTgToken ? "text" : "password"}
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                    placeholder="8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g"
                    className="w-full pl-3 pr-9 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-900/50 dark:border-slate-800 dark:text-white font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTgToken(!showTgToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    title={showTgToken ? "Hide token" : "Show token"}
                  >
                    {showTgToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Chat ID Input */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                  Telegram Chat ID / Group ID / Channel ID
                </label>
                <input
                  type="text"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  placeholder="-1004222754940"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-900/50 dark:border-slate-800 dark:text-white font-mono text-[11px]"
                />
                <p className="text-[9px] text-gray-400 mt-1 leading-normal">
                  អាចជា Chat ID ផ្ទាល់ខ្លួន ឬ ID របស់ Group/Channel (ចាប់ផ្ដើមដោយ -100...)។
                </p>
              </div>

              {/* Status metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-blue-500/15 text-[10px]">
                <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-lg border border-blue-500/10">
                  <span className="text-gray-400 block text-[9px]">ថ្ងៃនេះ (កម្ពុជា):</span>
                  <span className="font-mono font-bold text-gray-700 dark:text-gray-200 text-[10px]">{getCambodiaDateStr(0)}</span>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-lg border border-blue-500/10">
                  <span className="text-gray-400 block text-[9px]">ថ្ងៃស្អែក:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-[10px]">{getCambodiaDateStr(1)}</span>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-lg border border-blue-500/10">
                  <span className="text-gray-400 block text-[9px]">កិច្ចការកំពុងតាមដាន:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200 text-[10px]">{tasks.filter(t => t.status === 'Pending').length} tasks</span>
                </div>
                <div className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-lg border border-blue-500/10">
                  <span className="text-gray-400 block text-[9px]">ដល់ពេលរំលឹក (២៤h):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-[10px]">{tasks.filter(t => t.status === 'Pending' && checkTaskAdvanceAlert(t.date, t.time).shouldAlert).length} tasks</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleActivateCloudTrigger}
                  disabled={activatingCloudTrigger}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Enable 24/7 Autonomous Reminders on Google Cloud"
                >
                  {activatingCloudTrigger ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  <span>បើក Cloud Trigger ២៤/៧</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestTelegramServer}
                  disabled={testingTelegram}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Test Telegram Bot directly from browser"
                >
                  {testingTelegram ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  <span>Test Telegram Bot (ផ្ញើសារសាកល្បង)</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerWorkerCheck}
                  disabled={checkingWorker}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {checkingWorker ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Check Reminders Now (ត្រួតពិនិត្យឥឡូវ)</span>
                </button>
              </div>

              {/* Explanatory callout for 24/7 autonomous reminders */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-[11px] text-gray-700 dark:text-gray-300">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>តើប្រព័ន្ធអាចផ្ញើសារបានទេនៅពេលបិទប្រព័ន្ធ ឬបិទកុំព្យូទ័រ?</span>
                </div>
                <div className="text-[10px] space-y-1 leading-relaxed text-gray-600 dark:text-gray-400">
                  <p>
                    • <b>ប្រសិនបើដំណើរការតែលើ Browser៖</b> នៅពេលលោកអ្នកបិទ Browser ឬបិទកុំព្យូទ័រ សារមិនអាចផ្ញើបានទេ ព្រោះកូដ JavaScript លើ Browser ត្រូវបានផ្អាក។
                  </p>
                  <p>
                    • <b>🌟 ជាមួយ Google Cloud Trigger (Apps Script Backend)៖</b> ប្រព័ន្ធដំណើរការលើ Server Google Cloud ២៤/៧ ដោយស្វ័យប្រវត្តិក្លោដ! <b>ទោះបីលោកអ្នកបិទប្រព័ន្ធ បិទ Browser ឬបិទកុំព្យូទ័រក៏ដោយ ក៏ប្រព័ន្ធ Cloud នៅតែត្រួតពិនិត្យរៀងរាល់ ១០ នាទីម្តង និងផ្ញើសាររំលឹក ២៤ ម៉ោងមុនទៅ Telegram បាន ១០០%</b>។
                  </p>
                </div>
              </div>

              {cloudTriggerFeedback && (
                <div className={`p-2.5 rounded-lg text-[10px] flex items-start gap-2 leading-relaxed ${
                  cloudTriggerFeedback.startsWith('❌')
                    ? 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                }`}>
                  {cloudTriggerFeedback.startsWith('❌') ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{cloudTriggerFeedback}</span>
                </div>
              )}

              {telegramFeedback && (
                <div className={`p-2.5 rounded-lg text-[10px] flex items-start gap-2 leading-relaxed ${
                  telegramFeedback.startsWith('✅')
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
                }`}>
                  {telegramFeedback.startsWith('✅') ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{telegramFeedback}</span>
                </div>
              )}

              {workerFeedback && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{workerFeedback}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-slate-850"></div>

          {/* Section: Gemini API Key */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 select-none">
              <Key className="w-3.5 h-3.5" />
              <span>Gemini AI Generative Engine</span>
            </h4>
            
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Your Local Gemini API Key (Optional)</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Configured (AQ.Ab8RN6... active by default)" 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-none dark:bg-slate-900/50 dark:border-slate-800 dark:text-white font-mono text-xs"
              />
              <p className="text-[9px] text-gray-400 mt-1.5 leading-normal">
                An active Gemini API key is configured by default on the server and client. You can leave this blank or input a custom key to override.
              </p>
            </div>
          </div>

          {/* Save/Close Button Footer Row */}
          <div className="flex gap-2.5 pt-2">
            <button 
              type="submit" 
              className="flex-1 bg-gold-500 text-white font-medium py-2.5 rounded-lg hover:bg-gold-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              <span>Save & Sync Settings</span>
            </button>
            <button 
              type="button" 
              onClick={handleClearKey}
              className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white text-xs font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Clear API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SettingsModal;
