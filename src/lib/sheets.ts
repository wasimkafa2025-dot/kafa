import { Task } from '../types';

export const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbx16udHQpOdqaMfcb8JGHjw5EXLypzhZu9IPEmkfDZjgg3_Kzt3o2Nom08wZ8vag2hETA/exec';

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

  // Format Frequency as "Daily", "Monthly", or "Yearly"
  const rawType = (task.type || 'daily').toLowerCase();
  let formattedFrequency = 'Daily';
  if (rawType.includes('month')) {
    formattedFrequency = 'Monthly';
  } else if (rawType.includes('year')) {
    formattedFrequency = 'Yearly';
  } else {
    formattedFrequency = 'Daily';
  }

  const tagsVal = task.tags || '';

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
    type: formattedFrequency,
    frequency: formattedFrequency,
    taskFrequency: formattedFrequency,
    "Task Frequency": formattedFrequency,
    tags: tagsVal,
    tag: tagsVal,
    "Tags (optional)": tagsVal,
    "Tages (optional)": tagsVal,
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
 * - 3 Dedicated Sheets: "Daily Tasks", "Monthly Tasks", "Yearly Tasks"
 * - Columns: N (Auto sequence 1,2,3...), Task, Date, Time, Priority, Status, Task ID, Created At
 * - Full CRUD & Batch Sync support
 * - 1-Click setup function: setupThreeTaskSheets()
 */
export const RECOMMENDED_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * TASKFLOW & DAILY TASK MANAGEMENT - GOOGLE APPS SCRIPT BACKEND
 * =========================================================================
 * ប្រព័ន្ធគ្រប់គ្រង និងបម្រុងទុកទិន្នន័យភារកិច្ច (Backup Backend) តាមរយៈ Google Sheets
 * 
 * លក្ខណៈពិសេសនៃប្រព័ន្ធ៖
 * 1. បែងចែក Sheet ជា 3 ដោយស្វ័យប្រវត្តិ៖
 *    - "Daily Tasks"   (កិច្ចការប្រចាំថ្ងៃ)
 *    - "Monthly Tasks" (កិច្ចការប្រចាំខែ)
 *    - "Yearly Tasks"  (កិច្ចការប្រចាំឆ្នាំ)
 * 
 * 2. តារាងក្នុង Sheet នីមួយៗរួមមាន Columns តាមស្តង់ដារ៖
 *    - Column A (1): N (លំដាប់លេខរៀងស្វ័យប្រវត្តិ 1, 2, 3...)
 *    - Column B (2): Task (ឈ្មោះភារកិច្ច)
 *    - Column C (3): Date (កាលបរិច្ឆេទ)
 *    - Column D (4): Time (ពេលវេលា)
 *    - Column E (5): Priority (កម្រិតអាទិភាព: Urgent, High, Medium, Low)
 *    - Column F (6): Status (ស្ថានភាព: Pending, In Progress, Completed, Overdue)
 *    - Column G (7): Task ID (លេខសម្គាល់កិច្ចការ សម្រាប់ Sync & Update)
 *    - Column H (8): Created At (កាលបរិច្ឆេទបង្កើត)
 * 
 * 3. គាំទ្ររាល់ Actions: add, update, complete, delete, batch_sync, ping
 * 4. មានមុខងារ Auto-Setup រៀបចំ Header, ពណ៌ Navy & White, គំនូសព្រំដែន, និង Dropdown
 * =========================================================================
 */

var SHEET_NAMES = {
  DAILY: "Daily Tasks",
  MONTHLY: "Monthly Tasks",
  YEARLY: "Yearly Tasks"
};

var HEADERS = [
  "N",
  "Task",
  "Date",
  "Time",
  "Priority",
  "Status",
  "Task ID",
  "Created At"
];

var COLUMN_WIDTHS = [
  55,   // N (លំដាប់លេខរៀង)
  320,  // Task (ឈ្មោះភារកិច្ច)
  115,  // Date (កាលបរិច្ឆេទ)
  85,   // Time (ពេលវេលា)
  105,  // Priority (កម្រិតអាទិភាព)
  110,  // Status (ស្ថានភាព)
  130,  // Task ID (លេខសម្គាល់)
  145   // Created At (កាលបរិច្ឆេទបង្កើត)
];

/**
 * 🌟 1-CLICK SETUP FUNCTION:
 * ចុច Run លើ function នេះម្តង ដើម្បីបង្កើត Sheet ទាំង ៣ និង Header ដោយស្វ័យប្រវត្តិ
 */
function setupThreeTaskSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsToCreate = [SHEET_NAMES.DAILY, SHEET_NAMES.MONTHLY, SHEET_NAMES.YEARLY];
  
  for (var i = 0; i < sheetsToCreate.length; i++) {
    var sheetName = sheetsToCreate[i];
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    configureSingleSheet(sheet);
  }

  // ប្រសិនបើមាន Sheet1 ចាស់ទទេ អាចលុបចេញ
  var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("សន្លឹក១");
  if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }

  Logger.log("✅ បានតម្លើង Sheet ទាំង ៣ រួចរាល់ដោយជោគជ័យ៖ Daily Tasks, Monthly Tasks, Yearly Tasks!");
}

/**
 * កំណត់ទម្រង់ Header និង Data Validation សម្រាប់ Sheet មួយៗ
 */
function configureSingleSheet(sheet) {
  // កំណត់ Header ជួរដេកទី ១
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setValues([HEADERS]);

  // រចនាបទ Header (Navy & White Theme)
  headerRange.setBackground("#0B1F3A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontFamily("Arial");
  headerRange.setFontSize(11);
  headerRange.setFontWeight("bold");
  headerRange.setVerticalAlignment("middle");
  headerRange.setHorizontalAlignment("center");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  // កំណត់ប្រវែងទទឹងនៃ Column នីមួយៗ
  for (var c = 0; c < COLUMN_WIDTHS.length; c++) {
    sheet.setColumnWidth(c + 1, COLUMN_WIDTHS[c]);
  }

  // Data Validation Dropdown: Priority (Col 5 / Column E)
  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Urgent", "High", "Medium", "Low"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, Math.max(sheet.getMaxRows() - 1, 50), 1).setDataValidation(priorityRule);

  // Data Validation Dropdown: Status (Col 6 / Column F)
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Pending", "In Progress", "Completed", "Overdue"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, Math.max(sheet.getMaxRows() - 1, 50), 1).setDataValidation(statusRule);

  // Number Format សម្រាប់ Column A (N)
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 50), 1).setNumberFormat("0");

  // ប្រសិនបើមានទិន្នន័យស្រាប់ ធ្វើការរៀបចំ Formatting និងគណនា N ឡើងវិញ
  if (sheet.getLastRow() > 1) {
    renumberSheet(sheet);
    applyRowFormatting(sheet, 2, sheet.getLastRow() - 1);
  }
}

/**
 * ស្វែងរក ឬ បង្កើត Sheet តាមឈ្មោះ
 */
function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    configureSingleSheet(sheet);
  }
  return sheet;
}

/**
 * បែងចែក Task ទៅកាន់ Sheet ត្រឹមត្រូវតាម Frequency (Daily, Monthly, Yearly)
 */
function getTargetSheet(ss, taskTypeOrFreq) {
  var str = String(taskTypeOrFreq || "daily").toLowerCase().trim();
  if (str.indexOf("month") !== -1 || str.indexOf("ខែ") !== -1) {
    return getOrCreateSheet(ss, SHEET_NAMES.MONTHLY);
  } else if (str.indexOf("year") !== -1 || str.indexOf("ឆ្នាំ") !== -1) {
    return getOrCreateSheet(ss, SHEET_NAMES.YEARLY);
  } else {
    return getOrCreateSheet(ss, SHEET_NAMES.DAILY);
  }
}

/**
 * រៀបចំលេខរៀង N (Column A) អោយរត់ជាបន្តបន្ទាប់ 1, 2, 3...
 */
function renumberSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  var count = lastRow - 1;
  var numbers = [];
  for (var i = 1; i <= count; i++) {
    numbers.push([i]);
  }
  sheet.getRange(2, 1, count, 1).setValues(numbers);
  sheet.getRange(2, 1, count, 1).setHorizontalAlignment("center").setVerticalAlignment("middle");
}

/**
 * កំណត់ Style លើទិន្នន័យដែលបានបញ្ចូល
 */
function applyRowFormatting(sheet, startRow, numRows) {
  if (numRows <= 0) return;
  try {
    var range = sheet.getRange(startRow, 1, numRows, HEADERS.length);
    range.setFontFamily("Arial");
    range.setFontSize(10);
    range.setVerticalAlignment("middle");

    // Column B (Task): Left aligned, Wrap Text
    sheet.getRange(startRow, 2, numRows, 1)
      .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
      .setHorizontalAlignment("left");

    // Other Columns (N, Date, Time, Priority, Status, Task ID, Created At): Center aligned
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    for (var col = 3; col <= HEADERS.length; col++) {
      sheet.getRange(startRow, col, numRows, 1).setHorizontalAlignment("center");
    }

    // Set row height
    for (var r = 0; r < numRows; r++) {
      sheet.setRowHeight(startRow + r, 30);
    }
  } catch (err) {}
}

/**
 * POST Webhook Handler
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    var action = String(data.action || (e.parameter && e.parameter.action) || "").toLowerCase().trim();
    var targetId = String(data.id || data.taskId || (e.parameter && (e.parameter.id || e.parameter.taskId)) || "").trim();
    var targetTitle = String(data.task || data.title || (e.parameter && (e.parameter.task || e.parameter.title)) || "").trim();

    // 1. PING / TEST
    if (action === "ping" || data.test) {
      return createJsonResponse({
        success: true,
        message: "Google Sheets Backup Backend is online and ready",
        sheets: [SHEET_NAMES.DAILY, SHEET_NAMES.MONTHLY, SHEET_NAMES.YEARLY]
      });
    }

    // 2. BATCH SYNC ALL TASKS (បម្រុងទុក Task ទាំងអស់ចូលតាម Sheet ទាំង ៣)
    if (action === "batch_sync" && data.tasks && Array.isArray(data.tasks)) {
      var allSheets = [
        getOrCreateSheet(ss, SHEET_NAMES.DAILY),
        getOrCreateSheet(ss, SHEET_NAMES.MONTHLY),
        getOrCreateSheet(ss, SHEET_NAMES.YEARLY)
      ];

      // Clear old data rows in all 3 sheets
      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        if (sh.getLastRow() > 1) {
          sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent().clearFormat();
        }
        configureSingleSheet(sh);
      }

      var dailyRows = [];
      var monthlyRows = [];
      var yearlyRows = [];

      for (var k = 0; k < data.tasks.length; k++) {
        var t = data.tasks[k];
        var rawType = String(t.type || t.frequency || t.taskFrequency || "daily").toLowerCase();
        
        var dateVal = t.date || "";
        var timeVal = t.time || "";
        var priorityVal = t.priority || "Medium";
        var statusVal = t.status || "Pending";
        var taskIdVal = t.id || t.taskId || ("TASK_" + (k + 1));
        var createdAtVal = t.createdAt || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm");

        if (rawType.indexOf("month") !== -1 || rawType.indexOf("ខែ") !== -1) {
          monthlyRows.push([
            monthlyRows.length + 1, // N
            t.task || t.title || "",
            dateVal,
            timeVal,
            priorityVal,
            statusVal,
            taskIdVal,
            createdAtVal
          ]);
        } else if (rawType.indexOf("year") !== -1 || rawType.indexOf("ឆ្នាំ") !== -1) {
          yearlyRows.push([
            yearlyRows.length + 1, // N
            t.task || t.title || "",
            dateVal,
            timeVal,
            priorityVal,
            statusVal,
            taskIdVal,
            createdAtVal
          ]);
        } else {
          dailyRows.push([
            dailyRows.length + 1, // N
            t.task || t.title || "",
            dateVal,
            timeVal,
            priorityVal,
            statusVal,
            taskIdVal,
            createdAtVal
          ]);
        }
      }

      // Batch insert into sheets
      var dailySheet = getOrCreateSheet(ss, SHEET_NAMES.DAILY);
      if (dailyRows.length > 0) {
        dailySheet.getRange(2, 1, dailyRows.length, HEADERS.length).setValues(dailyRows);
        applyRowFormatting(dailySheet, 2, dailyRows.length);
      }

      var monthlySheet = getOrCreateSheet(ss, SHEET_NAMES.MONTHLY);
      if (monthlyRows.length > 0) {
        monthlySheet.getRange(2, 1, monthlyRows.length, HEADERS.length).setValues(monthlyRows);
        applyRowFormatting(monthlySheet, 2, monthlyRows.length);
      }

      var yearlySheet = getOrCreateSheet(ss, SHEET_NAMES.YEARLY);
      if (yearlyRows.length > 0) {
        yearlySheet.getRange(2, 1, yearlyRows.length, HEADERS.length).setValues(yearlyRows);
        applyRowFormatting(yearlySheet, 2, yearlyRows.length);
      }

      return createJsonResponse({
        success: true,
        message: "Synchronized " + data.tasks.length + " tasks successfully across 3 sheets!",
        details: {
          daily: dailyRows.length,
          monthly: monthlyRows.length,
          yearly: yearlyRows.length
        }
      });
    }

    // 3. DELETE ACTION (ស្វែងរក និងលុបចេញពី Sheet ណាមួយក្នុងចំណោម Sheet ទាំង ៣)
    if (action === "delete" || action === "remove" || data.isDelete) {
      var allSheets = [
        getOrCreateSheet(ss, SHEET_NAMES.DAILY),
        getOrCreateSheet(ss, SHEET_NAMES.MONTHLY),
        getOrCreateSheet(ss, SHEET_NAMES.YEARLY)
      ];

      var deleted = 0;
      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        var rows = sh.getDataRange().getValues();
        for (var r = rows.length - 1; r >= 1; r--) {
          var rowTaskId = String(rows[r][6] || "").trim(); // Col G: Task ID
          var rowTaskName = String(rows[r][1] || "").trim(); // Col B: Task

          if ((targetId && rowTaskId === targetId) || (targetTitle && rowTaskName === targetTitle)) {
            sh.deleteRow(r + 1);
            deleted++;
            renumberSheet(sh);
          }
        }
      }

      return createJsonResponse({
        success: true,
        message: "Deleted " + deleted + " task row(s) and renumbered sequence successfully",
        deletedCount: deleted
      });
    }

    // 4. COMPLETE ACTION (កែប្រែ Status ទៅជា "Completed")
    if (action === "complete") {
      var allSheets = [
        getOrCreateSheet(ss, SHEET_NAMES.DAILY),
        getOrCreateSheet(ss, SHEET_NAMES.MONTHLY),
        getOrCreateSheet(ss, SHEET_NAMES.YEARLY)
      ];

      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        var rows = sh.getDataRange().getValues();
        for (var r = 1; r < rows.length; r++) {
          var rowTaskId = String(rows[r][6] || "").trim();
          var rowTaskName = String(rows[r][1] || "").trim();

          if ((targetId && rowTaskId === targetId) || (targetTitle && rowTaskName === targetTitle)) {
            sh.getRange(r + 1, 6).setValue("Completed"); // Col 6: Status
            return createJsonResponse({
              success: true,
              message: "Task marked as Completed in " + sh.getName()
            });
          }
        }
      }
    }

    // 5. UPDATE ACTION (កែប្រែព័ត៌មាន Task ក្នុង Sheet)
    if (action === "update") {
      var allSheets = [
        getOrCreateSheet(ss, SHEET_NAMES.DAILY),
        getOrCreateSheet(ss, SHEET_NAMES.MONTHLY),
        getOrCreateSheet(ss, SHEET_NAMES.YEARLY)
      ];

      var targetSheet = getTargetSheet(ss, data.type || data.frequency || data.taskFrequency);

      for (var s = 0; s < allSheets.length; s++) {
        var sh = allSheets[s];
        var rows = sh.getDataRange().getValues();
        for (var r = 1; r < rows.length; r++) {
          var rowTaskId = String(rows[r][6] || "").trim();
          var rowTaskName = String(rows[r][1] || "").trim();

          if ((targetId && rowTaskId === targetId) || (targetTitle && rowTaskName === targetTitle)) {
            // ប្រសិនបើ Task ផ្លាស់ប្តូរ Sheet (ឧទាហរណ៍ពី Daily ទៅ Monthly)
            if (sh.getName() !== targetSheet.getName()) {
              sh.deleteRow(r + 1);
              renumberSheet(sh);

              var nextN = Math.max(1, targetSheet.getLastRow());
              var newRow = [
                nextN,
                data.task || data.title || rowTaskName,
                data.date || rows[r][2],
                data.time || rows[r][3],
                data.priority || rows[r][4],
                data.status || rows[r][5],
                targetId || rowTaskId,
                data.createdAt || rows[r][7]
              ];
              targetSheet.appendRow(newRow);
              applyRowFormatting(targetSheet, targetSheet.getLastRow(), 1);
              renumberSheet(targetSheet);
            } else {
              // នៅ Sheet ដដែល គ្រាន់តែកែប្រែតម្លៃ
              var currentN = rows[r][0]; // រក្សាទុក N ដដែល
              var updatedRow = [
                currentN,
                data.task || data.title || rows[r][1],
                data.date || rows[r][2],
                data.time || rows[r][3],
                data.priority || rows[r][4],
                data.status || rows[r][5],
                targetId || rowTaskId,
                data.createdAt || rows[r][7]
              ];
              sh.getRange(r + 1, 1, 1, HEADERS.length).setValues([updatedRow]);
              applyRowFormatting(sh, r + 1, 1);
            }

            return createJsonResponse({
              success: true,
              message: "Task updated successfully in " + targetSheet.getName()
            });
          }
        }
      }
    }

    // 6. ADD ACTION (បញ្ចូល Task ថ្មីទៅក្នុង Sheet ដែលត្រូវគ្នា)
    var targetSheet = getTargetSheet(ss, data.type || data.frequency || data.taskFrequency);
    var nextN = Math.max(1, targetSheet.getLastRow()); // Row 1 ជា Header ដូច្នេះ row 2 មាន N=1
    
    var newRow = [
      nextN,
      data.task || data.title || "",
      data.date || "",
      data.time || "",
      data.priority || "Medium",
      data.status || "Pending",
      data.id || data.taskId || ("TASK_" + new Date().getTime()),
      data.createdAt || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm")
    ];

    targetSheet.appendRow(newRow);
    var addedRowIndex = targetSheet.getLastRow();
    applyRowFormatting(targetSheet, addedRowIndex, 1);
    renumberSheet(targetSheet);

    return createJsonResponse({
      success: true,
      message: "Added task successfully to " + targetSheet.getName(),
      sheet: targetSheet.getName(),
      n: nextN
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * GET Webhook Handler (សម្រាប់ Test Connection & Browser Verification)
 */
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "";
  
  if (action === "setup") {
    setupThreeTaskSheets();
    return createJsonResponse({
      success: true,
      message: "3 Sheets setup completed successfully!"
    });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var daily = ss.getSheetByName(SHEET_NAMES.DAILY);
  var monthly = ss.getSheetByName(SHEET_NAMES.MONTHLY);
  var yearly = ss.getSheetByName(SHEET_NAMES.YEARLY);

  var counts = {
    daily: daily ? Math.max(0, daily.getLastRow() - 1) : 0,
    monthly: monthly ? Math.max(0, monthly.getLastRow() - 1) : 0,
    yearly: yearly ? Math.max(0, yearly.getLastRow() - 1) : 0
  };

  return createJsonResponse({
    status: "online",
    service: "Daily Task Management - 3 Sheets Backend Service",
    version: "4.0",
    sheets: [SHEET_NAMES.DAILY, SHEET_NAMES.MONTHLY, SHEET_NAMES.YEARLY],
    taskCounts: counts,
    totalTasks: counts.daily + counts.monthly + counts.yearly,
    timestamp: new Date().toISOString()
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
