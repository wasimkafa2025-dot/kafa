import React, { useState, useEffect } from 'react';
import { getActiveDbMode, setActiveDbMode } from '../lib/firebase';
import { 
  getGoogleSheetsUrl, 
  setGoogleSheetsUrl, 
  isGoogleSheetsSyncEnabled, 
  setGoogleSheetsSyncEnabled, 
  testGoogleSheetConnection, 
  syncAllTasksToGoogleSheet,
  DEFAULT_SHEETS_URL,
  RECOMMENDED_APPS_SCRIPT_CODE
} from '../lib/sheets';
import { Task } from '../types';
import { X, Key, Shield, HelpCircle, HardDrive, Database, Info, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Send, Code, Copy, Check, Trash2, Bell, Clock, Radio, Palette } from 'lucide-react';

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

  const handleTriggerWorkerCheck = async () => {
    setCheckingWorker(true);
    setWorkerFeedback(null);
    try {
      const res = await fetch('/api/reminders/check-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setWorkerFeedback(`បានត្រួតពិនិត្យ ${data.checked} កិច្ចការ, បានផ្ញើសាររំលឹក ${data.sent} កិច្ចការ។`);
        fetchWorkerStatus();
      } else {
        setWorkerFeedback(`មានបញ្ហា: ${data.error || 'បរាជ័យ'}`);
      }
    } catch (err: any) {
      setWorkerFeedback(`បរាជ័យ: ${err?.message || 'Error'}`);
    } finally {
      setCheckingWorker(false);
    }
  };

  useEffect(() => {
    setApiKey(localStorage.getItem('taskflow_gemini_api_key') || '');
    setDbMode(getActiveDbMode());
    setSheetsUrlState(getGoogleSheetsUrl());
    setSheetsEnabledState(isGoogleSheetsSyncEnabled());
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
    <div className="fixed inset-0 bg-black/55 z-[999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#112240] border border-gray-250 dark:border-gold-500/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gold-500 cursor-pointer transition-colors"
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
                    Google Apps Script (doPost with Auto-Delete)
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
                  💡 <b>ណែនាំ៖</b> សូមចម្លងកូដនេះទៅដាក់ក្នុង <b>script.google.com</b> របស់លោកអ្នក រួចចុច <b>Deploy &gt; Manage deployments &gt; Edit &gt; New version</b> ដើម្បីធានាថា Google Sheet របស់លោកអ្នកមានមុខងារលុបជួរដេកតាម ID ស្វ័យប្រវត្តិ។
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

          {/* Section: 24/7 Autonomous Background Task Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5 select-none">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <span>24/7 Cloud Background Reminders (ការរំលឹកស្វ័យប្រវត្តិ ២៤ ម៉ោង)</span>
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Active 24/7</span>
              </span>
            </div>

            <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed">
                <Radio className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-400">
                    ដំណើរការរំលឹកមុន ១ ថ្ងៃជានិច្ច ទោះបីជាមិនបានបើកប្រព័ន្ធ (Browser Closed)
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-normal">
                    ប្រព័ន្ធ Cloud Server ដំណើរការត្រួតពិនិត្យ 24/7 ស្វ័យប្រវត្តិតាមម៉ោងនៅកម្ពុជា (UTC+7)។ រាល់កិច្ចការដែលត្រូវបំពេញនៅថ្ងៃស្អែក ប្រព័ន្ធនឹងផ្ញើសាររំលឹកទៅកាន់ Telegram របស់លោក កាហ្វា ដោយមិនចាំបាច់បើក Tab ឬឧបករណ៍ឡើយ។
                  </p>
                </div>
              </div>

              {workerStatus && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-500/15 text-[10px]">
                  <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-500/10">
                    <span className="text-gray-400 block">ថ្ងៃនេះ (កម្ពុជា):</span>
                    <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{workerStatus.cambodiaToday}</span>
                  </div>
                  <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-500/10">
                    <span className="text-gray-400 block">ថ្ងៃស្អែក (ត្រូវរំលឹក):</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{workerStatus.cambodiaTomorrow}</span>
                  </div>
                  <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-500/10">
                    <span className="text-gray-400 block">កិច្ចការកំពុងតាមដាន:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{workerStatus.monitoredTasksCount} tasks</span>
                  </div>
                  <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-blue-500/10">
                    <span className="text-gray-400 block">កិច្ចការដល់ថ្ងៃស្អែក:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{workerStatus.pendingDueTomorrowCount} tasks</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerWorkerCheck}
                  disabled={checkingWorker}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {checkingWorker ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Run Cloud Check Now (ត្រួតពិនិត្យ និងផ្ញើរំលឹកឥឡូវនេះ)</span>
                </button>
              </div>

              {workerFeedback && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
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
                placeholder="Paste API Key here (starts with AIzaSy...)" 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:outline-none dark:bg-slate-900/50 dark:border-slate-800 dark:text-white font-mono text-xs"
              />
              <p className="text-[9px] text-gray-400 mt-1.5 leading-normal">
                Leave this field blank to automatically fall back to the secure backend server-side <b>process.env.GEMINI_API_KEY</b> injected by Google AI Studio Build!
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
