import { Task } from '../types';

export const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyx__UhJ9vOS0s_WvSlhRLgS6FxKPJEHPnBZMqm4I2dzaeQGayV7FIBTbIvpOlbLu-8yg/exec';

export function getGoogleSheetsUrl(): string {
  return localStorage.getItem('taskflow_google_sheets_url') || DEFAULT_SHEETS_URL;
}

export function setGoogleSheetsUrl(url: string): void {
  if (url.trim()) {
    localStorage.setItem('taskflow_google_sheets_url', url.trim());
  } else {
    localStorage.removeItem('taskflow_google_sheets_url');
  }
}

export function isGoogleSheetsSyncEnabled(): boolean {
  const val = localStorage.getItem('taskflow_google_sheets_enabled');
  return val === null ? true : val === 'true';
}

export function setGoogleSheetsSyncEnabled(enabled: boolean): void {
  localStorage.setItem('taskflow_google_sheets_enabled', enabled ? 'true' : 'false');
}

export interface SheetSyncResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Format a task object into a standardized record suitable for Google Sheets
 */
function formatTaskForSheet(task: Partial<Task>, action: string) {
  const isDelete = action === 'delete' || action === 'remove';
  return {
    action,
    method: isDelete ? 'delete' : action,
    operation: action,
    isDelete,
    id: task.id || '',
    taskId: task.id || '',
    task: task.task || '',
    title: task.task || '',
    name: task.task || '',
    description: task.description || '',
    date: task.date || '',
    time: task.time || '',
    month: task.month || '',
    priority: task.priority || 'Medium',
    status: isDelete ? 'Deleted' : (task.status || 'Pending'),
    type: task.type || 'daily',
    tags: task.tags || '',
    userId: task.userId || 'Kafa',
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || '',
    isArchived: task.isArchived ? 'true' : 'false',
    syncedAt: new Date().toISOString()
  };
}

/**
 * Send a sync payload to the Google Apps Script endpoint via backend proxy or direct fetch
 */
async function sendToSheet(payload: any): Promise<SheetSyncResponse> {
  const targetUrl = getGoogleSheetsUrl();

  // Try backend proxy first to avoid browser CORS / 302 redirect issues
  try {
    const proxyRes = await fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        payload
      })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return { success: true, message: data.data?.message || 'Synchronized successfully' };
    }
  } catch (err) {
    console.warn('Backend sheets proxy failed, attempting direct fetch:', err);
  }

  // Fallback to direct client fetch
  try {
    let finalUrl = targetUrl;
    if (payload && (payload.action === 'delete' || payload.isDelete)) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      const q = new URLSearchParams({
        action: 'delete',
        id: payload.id || payload.taskId || '',
        task: payload.task || payload.title || ''
      }).toString();
      finalUrl = `${finalUrl}${sep}${q}`;
    }

    const directRes = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors' // Google Apps Script redirects might be opaque in no-cors
    });
    return { success: true, message: 'Payload dispatched to Google Sheets' };
  } catch (directErr: any) {
    console.error('Direct Google Sheets sync failed:', directErr);
    return { success: false, error: directErr?.message || 'Failed to sync with Google Sheet' };
  }
}

/**
 * Sync a single task action (create, update, delete, complete, archive)
 */
export async function syncTaskToGoogleSheet(
  task: Partial<Task>,
  action: 'add' | 'update' | 'delete' | 'complete' | 'archive'
): Promise<SheetSyncResponse> {
  if (!isGoogleSheetsSyncEnabled()) {
    return { success: true, message: 'Google Sheets sync is disabled' };
  }

  const payload = formatTaskForSheet(task, action);
  return sendToSheet(payload);
}

/**
 * Explicit helper to delete a task from Google Sheet
 */
export async function deleteTaskFromGoogleSheet(task: Partial<Task>): Promise<SheetSyncResponse> {
  return syncTaskToGoogleSheet(task, 'delete');
}

/**
 * Recommended Apps Script code snippet for the user's Google Sheet
 */
export const RECOMMENDED_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    }
    
    var action = (data.action || (e.parameter && e.parameter.action) || "").toLowerCase();
    var targetId = String(data.id || data.taskId || (e.parameter && (e.parameter.id || e.parameter.taskId)) || "").trim();
    var targetTitle = String(data.task || data.title || (e.parameter && (e.parameter.task || e.parameter.title)) || "").trim();

    // 1. DELETE ACTION: Deletes row matching ID or Task Title automatically
    if (action === "delete" || action === "remove") {
      var rows = sheet.getDataRange().getValues();
      var deletedCount = 0;
      for (var i = rows.length - 1; i >= 1; i--) {
        var row = rows[i];
        var rowId = String(row[0] || "").trim(); // Column A: ID
        var rowTitle = String(row[1] || "").trim(); // Column B: Task
        
        if ((targetId && rowId === targetId) || 
            (targetTitle && rowTitle === targetTitle) ||
            (targetId && row.join(" ").indexOf(targetId) !== -1)) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        message: "Deleted " + deletedCount + " row(s) successfully",
        action: "delete"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. UPDATE / COMPLETE ACTION
    if (action === "update" || action === "complete") {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var rowId = String(row[0] || "").trim();
        if (targetId && rowId === targetId) {
          sheet.getRange(i + 1, 1, 1, 10).setValues([[
            data.id || row[0],
            data.task || row[1],
            data.date || row[2],
            data.time || row[3],
            data.month || row[4],
            data.priority || row[5],
            data.status || (action === "complete" ? "Completed" : row[6]),
            data.type || row[7],
            data.userId || row[8],
            data.createdAt || row[9]
          ]]);
          return ContentService.createTextOutput(JSON.stringify({success: true, message: "Updated row"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 3. BATCH SYNC: Clean and rewrite all active tasks
    if (action === "batch_sync" && data.tasks && Array.isArray(data.tasks)) {
      sheet.clearContents();
      sheet.appendRow(["ID", "Task", "Date", "Time", "Month", "Priority", "Status", "Type", "UserId", "CreatedAt"]);
      for (var k = 0; k < data.tasks.length; k++) {
        var t = data.tasks[k];
        sheet.appendRow([t.id, t.task, t.date, t.time, t.month, t.priority, t.status, t.type, t.userId, t.createdAt]);
      }
      return ContentService.createTextOutput(JSON.stringify({success: true, message: "Batch synced " + data.tasks.length + " tasks"})).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. ADD ACTION (Default)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Task", "Date", "Time", "Month", "Priority", "Status", "Type", "UserId", "CreatedAt"]);
    }
    sheet.appendRow([
      data.id || "", data.task || "", data.date || "", data.time || "", 
      data.month || "", data.priority || "Medium", data.status || "Pending", 
      data.type || "daily", data.userId || "Kafa", data.createdAt || new Date().toISOString()
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({success: true, message: "Added row successfully"})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "TaskFlow Google Sheets Integration",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * Batch export and synchronize all active tasks to the Google Sheet backend
 */
export async function syncAllTasksToGoogleSheet(tasks: Task[]): Promise<SheetSyncResponse> {
  const formattedTasks = tasks.map(t => formatTaskForSheet(t, 'batch_sync'));
  const payload = {
    action: 'batch_sync',
    count: formattedTasks.length,
    timestamp: new Date().toISOString(),
    tasks: formattedTasks
  };

  return sendToSheet(payload);
}

/**
 * Test connectivity with the Google Sheets Apps Script endpoint
 */
export async function testGoogleSheetConnection(): Promise<SheetSyncResponse> {
  const payload = {
    action: 'ping',
    test: true,
    timestamp: new Date().toISOString(),
    source: 'TaskFlow App'
  };

  return sendToSheet(payload);
}
