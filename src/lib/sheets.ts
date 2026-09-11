import { Task } from '../types';

export const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbw7ZftkEvhPqDKRfpxSPcl8lAq-BdkIdPGvx8yVe7FwXgNwbMnfswQlOnK4o_1xlxykgg/exec';

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

  // Format date/time cleanly (avoid raw ugly ISO strings)
  let cleanCreatedAt = '';
  if (task.createdAt) {
    try {
      const d = new Date(task.createdAt);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        cleanCreatedAt = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      } else {
        cleanCreatedAt = task.createdAt;
      }
    } catch {
      cleanCreatedAt = task.createdAt || '';
    }
  } else {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    cleanCreatedAt = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

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
    month: task.month || (task.date ? task.date.substring(0, 7) : ''),
    priority: task.priority || 'Medium',
    status: isDelete ? 'Deleted' : (task.status || 'Pending'),
    type: task.type || 'daily',
    frequency: task.type || 'daily',
    taskFrequency: task.type || 'daily',
    tags: task.tags || '',
    userId: task.userId || 'Kafa',
    user: task.userId || 'Kafa',
    createdAt: cleanCreatedAt,
    completedAt: task.completedAt || '',
    isArchived: task.isArchived ? 'true' : 'false',
    syncedAt: cleanCreatedAt
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
 * Features:
 * - Dynamic Column-Header Mapping (Maps ID, Task, Date, Time, Priority, Status, Frequency, User, CreatedAt to exact headers)
 * - Professional Styling (Navy & Gold header theme, text-wrap, auto column widths, middle alignments)
 * - Built-in Data Validation Dropdowns for Priority and Status
 * - 1-Click setup function: setupProfessionalSheet()
 */
export const RECOMMENDED_APPS_SCRIPT_CODE = `/**
 * TASKFLOW & DAILY TASK MANAGEMENT - GOOGLE APPS SCRIPT
 * Version: 3.0 (Smart Column-Header Mapping & Professional Formatting)
 */

var STANDARD_HEADERS = [
  "ID",
  "Task",
  "Date",
  "Time",
  "Priority",
  "Status",
  "Task Frequency",
  "User",
  "Created At"
];

function doPost(e) {
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

    // Ensure header row exists; if sheet is empty, setup professional layout
    if (sheet.getLastRow() === 0) {
      setupProfessionalSheet();
    }

    // 1. DELETE ACTION: Deletes row matching ID or Task Title cleanly
    if (action === "delete" || action === "remove") {
      var rows = sheet.getDataRange().getValues();
      var deletedCount = 0;
      for (var i = rows.length - 1; i >= 1; i--) {
        var row = rows[i];
        var rowId = String(row[0] || "").trim();
        var rowTitle = String(row[1] || "").trim();
        
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

    // Read current headers in Row 1 to enable Smart Header Mapping
    var lastCol = Math.max(sheet.getLastColumn(), STANDARD_HEADERS.length);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // Check if headers are empty, initialize if needed
    if (!headers[0] && !headers[1]) {
      setupProfessionalSheet();
      headers = sheet.getRange(1, 1, 1, STANDARD_HEADERS.length).getValues()[0];
      lastCol = STANDARD_HEADERS.length;
    }

    // 2. BATCH SYNC: Clean and rewrite all active tasks with smart columns
    if (action === "batch_sync" && data.tasks && Array.isArray(data.tasks)) {
      // Keep row 1 headers, clear old data rows below
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).clearContent().clearFormat();
      }
      for (var k = 0; k < data.tasks.length; k++) {
        var t = data.tasks[k];
        var rowData = mapDataToHeaders(headers, t);
        sheet.appendRow(rowData);
      }
      applyRowFormatting(sheet, 2, data.tasks.length, lastCol);
      return ContentService.createTextOutput(JSON.stringify({
        success: true, 
        message: "Batch synced " + data.tasks.length + " tasks with perfect column alignment"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. UPDATE / COMPLETE ACTION: Update the existing matching row
    if (action === "update" || action === "complete") {
      var rows = sheet.getDataRange().getValues();
      for (var r = 1; r < rows.length; r++) {
        var rowId = String(rows[r][0] || "").trim();
        var rowTitle = String(rows[r][1] || "").trim();
        if ((targetId && rowId === targetId) || (targetTitle && rowTitle === targetTitle)) {
          if (action === "complete") data.status = "Completed";
          var updatedRow = mapDataToHeaders(headers, data, rows[r]);
          sheet.getRange(r + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
          applyRowFormatting(sheet, r + 1, 1, updatedRow.length);
          return ContentService.createTextOutput(JSON.stringify({
            success: true, 
            message: "Updated row " + (r + 1) + " successfully"
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 4. ADD ACTION (Default): Append a new cleanly mapped row
    var newRow = mapDataToHeaders(headers, data);
    sheet.appendRow(newRow);
    var addedRowIndex = sheet.getLastRow();
    applyRowFormatting(sheet, addedRowIndex, 1, newRow.length);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true, 
      message: "Added task to Google Sheet with perfect column alignment"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, 
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Maps task fields into row array matching sheet headers dynamically
 */
function mapDataToHeaders(headers, data, existingRow) {
  var row = [];
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase();
    var fallback = existingRow && existingRow[c] !== undefined ? existingRow[c] : "";
    
    if (!h) {
      row.push(fallback);
      continue;
    }

    if (h.indexOf("id") !== -1) {
      row.push(data.id || data.taskId || fallback);
    } else if (h.indexOf("task") !== -1 || h.indexOf("title") !== -1 || h.indexOf("កិច្ចការ") !== -1) {
      row.push(data.task || data.title || fallback);
    } else if (h.indexOf("created") !== -1 || h.indexOf("បង្កើត") !== -1) {
      row.push(data.createdAt || fallback);
    } else if (h.indexOf("completed") !== -1 || h.indexOf("បញ្ចប់") !== -1) {
      row.push(data.completedAt || fallback);
    } else if (h.indexOf("date") !== -1 || h.indexOf("កាលបរិច្ឆេទ") !== -1 || h.indexOf("ថ្ងៃ") !== -1) {
      row.push(data.date || fallback);
    } else if (h.indexOf("time") !== -1 || h.indexOf("ម៉ោង") !== -1 || h.indexOf("ពេល") !== -1) {
      row.push(data.time || fallback);
    } else if (h.indexOf("priority") !== -1 || h.indexOf("អាទិភាព") !== -1) {
      row.push(data.priority || fallback || "Medium");
    } else if (h.indexOf("status") !== -1 || h.indexOf("ស្ថានភាព") !== -1) {
      row.push(data.status || fallback || "Pending");
    } else if (h.indexOf("frequency") !== -1 || h.indexOf("type") !== -1 || h.indexOf("ប្រភេទ") !== -1) {
      row.push(data.type || data.frequency || data.taskFrequency || fallback || "daily");
    } else if (h.indexOf("user") !== -1 || h.indexOf("assign") !== -1 || h.indexOf("អ្នក") !== -1) {
      row.push(data.userId || data.user || fallback || "Kafa");
    } else if (h.indexOf("month") !== -1 || h.indexOf("ខែ") !== -1) {
      row.push(data.month || fallback || "");
    } else {
      row.push(data[h] !== undefined ? data[h] : fallback);
    }
  }
  return row;
}

/**
 * Formats data rows (vertical centering, text wrapping on task, font styling)
 */
function applyRowFormatting(sheet, startRow, numRows, numCols) {
  if (numRows <= 0) return;
  try {
    var dataRange = sheet.getRange(startRow, 1, numRows, numCols);
    dataRange.setFontFamily("Arial");
    dataRange.setFontSize(10);
    dataRange.setVerticalAlignment("middle");

    // Task column (Col B / Col 2) wrap text
    sheet.getRange(startRow, 2, numRows, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

    // Center alignment for Date, Time, Priority, Status, Frequency, User, CreatedAt
    for (var col = 3; col <= numCols; col++) {
      sheet.getRange(startRow, col, numRows, 1).setHorizontalAlignment("center");
    }
  } catch (e) {
    // Non-fatal styling error
  }
}

/**
 * 🌟 1-CLICK SETUP FUNCTION
 * Select this function in Apps Script editor and click "Run" to automatically
 * create headers, set column widths, apply Navy & Gold theme, and add dropdown validations!
 */
function setupProfessionalSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Set headers in Row 1
  var headerRange = sheet.getRange(1, 1, 1, STANDARD_HEADERS.length);
  headerRange.setValues([STANDARD_HEADERS]);
  
  // Professional Navy & White styling
  headerRange.setBackground("#0B1F3A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontFamily("Arial");
  headerRange.setFontSize(11);
  headerRange.setFontWeight("bold");
  headerRange.setVerticalAlignment("middle");
  headerRange.setHorizontalAlignment("center");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  // Set optimal column widths
  var widths = [110, 340, 115, 90, 110, 115, 125, 100, 155];
  for (var i = 0; i < widths.length; i++) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  // Priority Dropdown (Column E)
  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Urgent", "High", "Medium", "Low"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, Math.max(sheet.getMaxRows() - 1, 100), 1).setDataValidation(priorityRule);

  // Status Dropdown (Column F)
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending", "In Progress", "Completed", "Overdue"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, Math.max(sheet.getMaxRows() - 1, 100), 1).setDataValidation(statusRule);

  // Task Frequency Dropdown (Column G)
  var freqRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["daily", "monthly", "yearly"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 7, Math.max(sheet.getMaxRows() - 1, 100), 1).setDataValidation(freqRule);

  // Format existing data rows if any
  if (sheet.getLastRow() > 1) {
    applyRowFormatting(sheet, 2, sheet.getLastRow() - 1, STANDARD_HEADERS.length);
  }

  Logger.log("✅ Google Sheet has been successfully set up with professional formatting and column alignment!");
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "TaskFlow & Daily Task Management - Google Sheets Service v3.0",
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
