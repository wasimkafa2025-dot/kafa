/**
 * =========================================================================
 * TASKFLOW & DAILY TASK MANAGEMENT - GOOGLE APPS SCRIPT BACKEND v5.0
 * =========================================================================
 * ប្រព័ន្ធគ្រប់គ្រង និងបម្រុងទុកទិន្នន័យភារកិច្ច (Backup Backend) តាមរយៈ Google Sheets
 * ព្រមទាំងប្រព័ន្ធផ្ញើសាររំលឹកស្វ័យប្រវត្តិតាម Telegram Bot រត់លើ Cloud ២៤/៧
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
 *    - Column C (3): Date (កាលបរិច្ឆេទ YYYY-MM-DD)
 *    - Column D (4): Time (ពេលវេលា HH:mm)
 *    - Column E (5): Priority (កម្រិតអាទិភាព: Urgent, High, Medium, Low)
 *    - Column F (6): Status (ស្ថានភាព: Pending, In Progress, Completed, Overdue)
 *    - Column G (7): Task ID (លេខសម្គាល់កិច្ចការ សម្រាប់ Sync & Update)
 *    - Column H (8): Created At (កាលបរិច្ឆេទបង្កើត)
 * 
 * 3. គាំទ្ររាល់ Actions ពី Web: add, update, complete, delete, batch_sync, ping
 * 4. មានមុខងារ Auto-Setup រៀបចំ Header, ពណ៌ Navy & White, គំនូសព្រំដែន, និង Dropdown
 * 
 * 5. 🌟 24/7 AUTONOMOUS CLOUD TELEGRAM REMINDER (រត់លើ Google Cloud ស្វ័យប្រវត្តិ)៖
 *    - ដំណើរការ ២៤ម៉ោង/៧ថ្ងៃ ទោះបីលោកអ្នកបិទ Browser ឬបិទកុំព្យូទ័រក៏ដោយ!
 *    - ត្រួតពិនិត្យរាល់កិច្ចការក្នុង Daily Tasks, Monthly Tasks, Yearly Tasks រៀងរាល់ ១០ នាទីម្តង
 *    - ផ្ញើសាររំលឹកមុន ២៤ ម៉ោង (1 Day in advance) ទៅកាន់ Telegram Bot ដោយស្វ័យប្រវត្តិ
 *    - ផ្ញើសាររំលឹកបន្ទាន់នៅពេលកិច្ចការជិតដល់ម៉ោងកំណត់ (Imminent <= 2 hours)
 *    - មិនផ្ញើសាររំខាននៅពេលដែលកិច្ចការបានបំពេញរួចរាល់ឡើយ
 *    - ប្រើប្រាស់ PropertiesService ដើម្បីកុំឱ្យផ្ញើសារស្ទួន (Anti-duplicate deduplication)
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
 * Telegram Bot Configuration
 */
var TELEGRAM_CONFIG = {
  BOT_TOKEN: "9094304725:AAEhU0iGMwg1atdgSl-gPq1F7jyMrKZu2zY",
  CHAT_ID: "6536906357", // Mr. Kafa
  TIMEZONE: "GMT+7",
  BOT_NAME: "MAAT KAFA DAILY TASK"
};

/**
 * 🌟 1-CLICK SETUP FUNCTION FOR SHEETS:
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
  return { success: true, message: "Sheets setup completed successfully" };
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
 * =========================================================================
 * TELEGRAM BOT NOTIFICATION SERVICE (CLOUD RUNTIME)
 * =========================================================================
 */

/**
 * មុខងារផ្ញើសារទៅកាន់ Telegram Bot ដោយផ្ទាល់តាមរយៈ UrlFetchApp របស់ Google Cloud
 */
function sendTelegramMessage(text) {
  if (!TELEGRAM_CONFIG.BOT_TOKEN || !TELEGRAM_CONFIG.CHAT_ID) {
    Logger.log("⚠️ Telegram Bot Token or Chat ID not configured.");
    return false;
  }
  
  var url = "https://api.telegram.org/bot" + TELEGRAM_CONFIG.BOT_TOKEN + "/sendMessage";
  var payload = {
    chat_id: TELEGRAM_CONFIG.CHAT_ID,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    Logger.log("Telegram API Response (" + statusCode + "): " + responseText);
    return statusCode === 200;
  } catch (err) {
    Logger.log("❌ Error calling Telegram API: " + err.toString());
    return false;
  }
}

/**
 * ជំនួយការគណនាកាលបរិច្ឆេទ និងពេលវេលាកិច្ចការ (GMT+7)
 */
function parseTaskDateTime(dateVal, timeVal) {
  if (!dateVal) return null;

  var dateStr = "";
  if (dateVal instanceof Date) {
    dateStr = Utilities.formatDate(dateVal, TELEGRAM_CONFIG.TIMEZONE, "yyyy-MM-dd");
  } else {
    var mDate = String(dateVal).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (mDate) {
      dateStr = mDate[1] + "-" + ("0" + mDate[2]).slice(-2) + "-" + ("0" + mDate[3]).slice(-2);
    } else {
      dateStr = String(dateVal).trim();
    }
  }

  var timeStr = "09:00";
  if (timeVal) {
    if (timeVal instanceof Date) {
      timeStr = Utilities.formatDate(timeVal, TELEGRAM_CONFIG.TIMEZONE, "HH:mm");
    } else {
      var mTime = String(timeVal).trim().match(/(\d{1,2}):(\d{2})/);
      if (mTime) {
        timeStr = ("0" + mTime[1]).slice(-2) + ":" + mTime[2];
      }
    }
  }

  var isoStr = dateStr + "T" + timeStr + ":00+07:00";
  var taskDate = new Date(isoStr);
  if (isNaN(taskDate.getTime())) {
    var dParts = dateStr.split("-");
    if (dParts.length === 3) {
      var tParts = timeStr.split(":");
      taskDate = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]), Number(tParts[0] || 0), Number(tParts[1] || 0));
    }
  }

  if (isNaN(taskDate.getTime())) return null;

  return {
    date: taskDate,
    dateStr: dateStr,
    timeStr: timeStr
  };
}

/**
 * ⏰ មុខងារពិនិត្យភារកិច្ច និងផ្ញើសាររំលឹកមុន ២៤ ម៉ោង (ដំណើរការស្វ័យប្រវត្តិតាម Time-driven Trigger)
 * រត់លើ Google Cloud ២៤/៧ រៀងរាល់ ១០ នាទីម្តង ទោះបីបិទកុំព្យូទ័រ ឬបិទ Browser ក៏ដំណើរការធម្មតា!
 */
function checkAndSendScheduledReminders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = [
    ss.getSheetByName(SHEET_NAMES.DAILY),
    ss.getSheetByName(SHEET_NAMES.MONTHLY),
    ss.getSheetByName(SHEET_NAMES.YEARLY)
  ];
  var scriptProperties = PropertiesService.getScriptProperties();
  
  var now = new Date();
  var sentCount = 0;
  var checkedCount = 0;
  var logs = [];

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    if (!sheet) continue;

    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue; // មានតែ Header

    var data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var taskNum = row[0];
      var taskTitle = String(row[1] || "").trim();
      var dateVal = row[2];
      var timeVal = row[3];
      var priority = String(row[4] || "Medium").trim();
      var status = String(row[5] || "Pending").trim();
      var taskId = String(row[6] || "").trim() || ("task_r" + (r + 2) + "_" + sheetName);

      if (!taskTitle) continue;
      checkedCount++;

      // Skip completed tasks (កិច្ចការដែលបានធ្វើរួចរាល់ មិនបាច់ផ្ញើសារទេ តាមការណែនាំរបស់អ្នកប្រើប្រាស់)
      if (status.toLowerCase() === "completed" || status.toLowerCase() === "done") {
        continue;
      }

      var parsed = parseTaskDateTime(dateVal, timeVal);
      if (!parsed) continue;

      var diffMs = parsed.date.getTime() - now.getTime();
      var diffHours = diffMs / (1000 * 60 * 60);

      // 1. ការជូនដំណឹងមុន ២៤ ម៉ោង (24h Advance Reminder):
      // នៅពេលដែលកិច្ចការស្ថិតក្នុងចន្លោះ ០ ម៉ោង ដល់ ២៤ ម៉ោង (0 < diffHours <= 24)
      if (diffHours > 0 && diffHours <= 24) {
        var notifKey24h = "sent_24h_" + taskId;
        var alreadySent24h = scriptProperties.getProperty(notifKey24h);

        if (!alreadySent24h) {
          var hoursRemaining = Math.max(1, Math.round(diffHours));
          var khmerType = sheetName === SHEET_NAMES.DAILY ? "កិច្ចការប្រចាំថ្ងៃ (Daily)" : (sheetName === SHEET_NAMES.MONTHLY ? "កិច្ចការប្រចាំខែ (Monthly)" : "កិច្ចការប្រចាំឆ្នាំ (Yearly)");
          
          var msg = "🔔 <b>[សេចក្តីរំលឹកមុន ២៤ ម៉ោង] ភារកិច្ចជិតមកដល់</b>\n" +
                    "━━━━━━━━━━━━━━━━━━━━\n" +
                    "📋 <b>ភារកិច្ច:</b> <b>" + taskTitle + "</b>\n" +
                    "📁 <b>ប្រភេទ:</b> " + khmerType + "\n" +
                    "📅 <b>កាលបរិច្ឆេទ:</b> " + parsed.dateStr + "\n" +
                    "⏰ <b>ពេលវេលា:</b> " + parsed.timeStr + " (ម៉ោងកម្ពុជា)\n" +
                    "⚡ <b>កម្រិតអាទិភាព:</b> " + priority + "\n" +
                    "⏳ <b>នៅសល់ពេលប្រមាណ:</b> " + hoursRemaining + " ម៉ោងទៀត\n" +
                    "━━━━━━━━━━━━━━━━━━━━\n" +
                    "🤖 <i>សារជូនដំណឹងស្វ័យប្រវត្តិតាម Cloud (២៤/៧ ទោះបីមិនបានបើកប្រព័ន្ធ)</i>";

          var ok = sendTelegramMessage(msg);
          if (ok) {
            scriptProperties.setProperty(notifKey24h, new Date().toISOString());
            sentCount++;
            logs.push("Sent 24h reminder for: " + taskTitle);
          }
        }
      }

      // 2. ការជូនដំណឹងបន្ទាន់ជិតដល់ម៉ោង (Imminent / Due in <= 2 hours):
      if (diffHours > 0 && diffHours <= 2) {
        var notifKeyImminent = "sent_imminent_" + taskId;
        var alreadySentImminent = scriptProperties.getProperty(notifKeyImminent);

        if (!alreadySentImminent) {
          var minutesRemaining = Math.max(1, Math.round(diffHours * 60));
          var khmerType = sheetName === SHEET_NAMES.DAILY ? "កិច្ចការប្រចាំថ្ងៃ (Daily)" : (sheetName === SHEET_NAMES.MONTHLY ? "កិច្ចការប្រចាំខែ (Monthly)" : "កិច្ចការប្រចាំឆ្នាំ (Yearly)");

          var msg2 = "⏰ <b>[រំលឹកបន្ទាន់] ភារកិច្ចជិតដល់ម៉ោងកំណត់!</b>\n" +
                     "━━━━━━━━━━━━━━━━━━━━\n" +
                     "📋 <b>ភារកិច្ច:</b> <b>" + taskTitle + "</b>\n" +
                     "📁 <b>ប្រភេទ:</b> " + khmerType + "\n" +
                     "📅 <b>កាលបរិច្ឆេទ:</b> " + parsed.dateStr + "\n" +
                     "⏰ <b>ពេលវេលា:</b> " + parsed.timeStr + "\n" +
                     "⚡ <b>កម្រិតអាទិភាព:</b> " + priority + "\n" +
                     "⏳ <b>នៅសល់ពេលត្រឹមតែ:</b> " + minutesRemaining + " នាទីទៀតប៉ុណ្ណោះ!\n" +
                     "━━━━━━━━━━━━━━━━━━━━\n" +
                     "🤖 <i>សារជូនដំណឹងស្វ័យប្រវត្តិតាម Cloud (២៤/៧)</i>";

          var ok2 = sendTelegramMessage(msg2);
          if (ok2) {
            scriptProperties.setProperty(notifKeyImminent, new Date().toISOString());
            sentCount++;
            logs.push("Sent imminent reminder for: " + taskTitle);
          }
        }
      }
    }
  }

  Logger.log("Done checking tasks. Checked: " + checkedCount + ", Sent: " + sentCount);
  return {
    checked: checkedCount,
    sent: sentCount,
    logs: logs,
    timestamp: new Date().toISOString()
  };
}

/**
 * 🌟 1-CLICK CLOUD TRIGGER SETUP:
 * បង្កើត Time-driven Trigger ដំណើរការរៀងរាល់ ១០ នាទីម្តងលើ Google Cloud
 * ចុច Run លើ function នេះម្តង នោះប្រព័ន្ធនឹងរត់ ២៤ម៉ោង/៧ថ្ងៃ ដោយស្វ័យប្រវត្តិ
 */
function setupAutonomous24hTrigger() {
  // លុប Trigger ចាស់ចោលដើម្បីកុំឱ្យជាន់គ្នា (Idempotent)
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkAndSendScheduledReminders") {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }

  // បង្កើត Time-driven Trigger ថ្មី រៀងរាល់ ១០ នាទីម្តង
  var newTrigger = ScriptApp.newTrigger("checkAndSendScheduledReminders")
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log("✅ បានបង្កើត Cloud Trigger ដោយជោគជ័យ! រត់រៀងរាល់ ១០ នាទីម្តង ២៤ម៉ោង/៧ថ្ងៃ។ Trigger ID: " + newTrigger.getUniqueId());

  // ផ្ញើសារបញ្ជាក់ទៅកាន់ Telegram Bot ភ្លាមៗ ដើម្បីបញ្ជាក់ថា Cloud Trigger បានដំណើរការហើយ
  sendTelegramMessage(
    "🚀 <b>ប្រព័ន្ធជូនដំណឹង ២៤/៧ Google Cloud ត្រូវបានបើកដំណើរការដោយជោគជ័យ!</b>\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "✅ <b>ស្ថានភាព:</b> Active (រត់រៀងរាល់ ១០ នាទីម្តង)\n" +
    "🌐 <b>Cloud Server:</b> Google Cloud Apps Script\n" +
    "📱 <b>Bot:</b> " + TELEGRAM_CONFIG.BOT_NAME + "\n" +
    "🔒 <b>ការធានា:</b> ទោះបីលោកអ្នកបិទកុំព្យូទ័រ ឬបិទ Browser ក៏ប្រព័ន្ធនៅតែត្រួតពិនិត្យ និងផ្ញើសាររំលឹក ២៤ ម៉ោងមុនបាន ១០០%!\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "<i>ពេលវេលាដំណើរការ៖ " + Utilities.formatDate(new Date(), TELEGRAM_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss") + "</i>"
  );

  return {
    success: true,
    message: "Cloud 24/7 autonomous reminder trigger created and activated successfully!",
    triggerId: newTrigger.getUniqueId(),
    removedOldTriggers: removed
  };
}

/**
 * សម្អាតប្រវត្តិរំលឹកចាស់ (Notification Cache) ក្នុងករណីចង់តេស្តឡើងវិញ
 */
function clearNotificationHistory() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  Logger.log("✅ បានសម្អាតប្រវត្តិរំលឹកចាស់រួចរាល់!");
  return { success: true, message: "Notification cache cleared" };
}

/**
 * =========================================================================
 * POST WEBHOOK HANDLER
 * =========================================================================
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
 * =========================================================================
 * GET WEBHOOK HANDLER (សម្រាប់ Web & Trigger Commands)
 * =========================================================================
 */
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "";
  
  // 1. បង្កើត Sheet ទាំង ៣
  if (action === "setup") {
    setupThreeTaskSheets();
    return createJsonResponse({
      success: true,
      message: "3 Sheets setup completed successfully!"
    });
  }

  // 2. បង្កើត Cloud Trigger ២៤/៧ (Time-driven Trigger)
  if (action === "setupTrigger" || action === "setup_trigger") {
    var triggerResult = setupAutonomous24hTrigger();
    return createJsonResponse(triggerResult);
  }

  // 3. ពិនិត្យកិច្ចការ និងផ្ញើសាររំលឹកភ្លាមៗ (Check Reminders Now)
  if (action === "checkReminders" || action === "check_reminders") {
    var checkResult = checkAndSendScheduledReminders();
    return createJsonResponse({
      success: true,
      message: "Checked tasks and sent due reminders",
      result: checkResult
    });
  }

  // 4. តេស្ត Telegram Bot ផ្ទាល់ពី Google Cloud
  if (action === "testTelegram" || action === "test_telegram") {
    var ok = sendTelegramMessage(
      "🔔 <b>តេស្តការតភ្ជាប់ពី Google Cloud Backend (២៤/៧)</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "✅ ការតភ្ជាប់ទៅកាន់ Bot <b>" + TELEGRAM_CONFIG.BOT_NAME + "</b> ដំណើរការល្អ ១០០%!\n" +
      "⏰ <b>ម៉ោងកម្ពុជា:</b> " + Utilities.formatDate(new Date(), TELEGRAM_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss") + "\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "<i>ប្រព័ន្ធដំណើរការលើ Google Cloud ស្វ័យប្រវត្តិក្លោដ</i>"
    );
    return createJsonResponse({
      success: ok,
      message: ok ? "Telegram message sent successfully" : "Failed to send Telegram message"
    });
  }

  // 5. សម្អាត Cache
  if (action === "clearHistory" || action === "clear_history") {
    var clearResult = clearNotificationHistory();
    return createJsonResponse(clearResult);
  }

  // 6. Default Status Check
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var daily = ss.getSheetByName(SHEET_NAMES.DAILY);
  var monthly = ss.getSheetByName(SHEET_NAMES.MONTHLY);
  var yearly = ss.getSheetByName(SHEET_NAMES.YEARLY);

  var counts = {
    daily: daily ? Math.max(0, daily.getLastRow() - 1) : 0,
    monthly: monthly ? Math.max(0, monthly.getLastRow() - 1) : 0,
    yearly: yearly ? Math.max(0, yearly.getLastRow() - 1) : 0
  };

  // ពិនិត្យមើលថាតើ Trigger បានបង្កើតហើយឬនៅ
  var triggers = ScriptApp.getProjectTriggers();
  var hasActiveTrigger = false;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkAndSendScheduledReminders") {
      hasActiveTrigger = true;
      break;
    }
  }

  return createJsonResponse({
    status: "online",
    service: "Daily Task Management - 3 Sheets Backend & 24/7 Telegram Cloud Reminders",
    version: "5.0",
    cloudAutonomous24hActive: hasActiveTrigger,
    sheets: [SHEET_NAMES.DAILY, SHEET_NAMES.MONTHLY, SHEET_NAMES.YEARLY],
    taskCounts: counts,
    totalTasks: counts.daily + counts.monthly + counts.yearly,
    timestamp: new Date().toISOString()
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
