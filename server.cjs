var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_logger = require("@firebase/logger");
var origConsoleWarn = console.warn;
var origConsoleError = console.error;
var isBloomFilterNoise = (args) => {
  return args.some((a) => {
    if (!a) return false;
    const str = typeof a === "string" ? a : a?.message || a?.stack || a?.name || String(a);
    return str.includes("BloomFilter") || str.includes("Invalid hash count");
  });
};
console.warn = function(...args) {
  if (isBloomFilterNoise(args)) return;
  origConsoleWarn.apply(console, args);
};
console.error = function(...args) {
  if (isBloomFilterNoise(args)) return;
  origConsoleError.apply(console, args);
};
try {
  (0, import_firestore.setLogLevel)("silent");
} catch {
}
try {
  (0, import_logger.setUserLogHandler)((logDetails) => {
    const msg = logDetails.message || "";
    if (msg.includes("BloomFilter") || msg.includes("Invalid hash count")) {
      return;
    }
    if (logDetails.level === "error") {
      origConsoleError(`[${logDetails.type}]:`, logDetails.message);
    }
  });
} catch {
}
var TG_BOT_TOKEN = "9094304725:AAEhU0iGMwg1atdgSl-gPq1F7jyMrKZu2zY";
var TG_CHAT_ID = "6536906357";
var DATA_DIR = import_path.default.join(process.cwd(), "data");
try {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  const testFile = import_path.default.join(DATA_DIR, ".write_test");
  import_fs.default.writeFileSync(testFile, "ok");
  import_fs.default.unlinkSync(testFile);
} catch {
  DATA_DIR = import_path.default.join("/tmp", "applet_data");
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
  }
}
var TASKS_FILE = import_path.default.join(DATA_DIR, "server_tasks.json");
var SENT_ALERTS_FILE = import_path.default.join(DATA_DIR, "sent_alerts.json");
var NOTIFICATIONS_FILE = import_path.default.join(DATA_DIR, "system_notifications.json");
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBc4rd74Ibf7nkV3SfTji8EDPChAZTW_LY",
  authDomain: "ai-studio-applet-webapp-313aa.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-313aa",
  storageBucket: "ai-studio-applet-webapp-313aa.firebasestorage.app",
  messagingSenderId: "833142233878",
  appId: "1:833142233878:web:4878a2f05c54cb14ae0e37"
};
var FIRESTORE_DATABASE_ID = "ai-studio-40322e71-9f6e-4f6d-8979-34628b9aa6af";
function getServerFirestore() {
  try {
    const app = (0, import_app.getApps)().length === 0 ? (0, import_app.initializeApp)(FIREBASE_CONFIG, "server_worker_app") : (0, import_app.getApp)("server_worker_app");
    return (0, import_firestore.getFirestore)(app, FIRESTORE_DATABASE_ID);
  } catch (err) {
    console.warn("Server Firestore init warning:", err);
    return null;
  }
}
function loadServerTasks() {
  try {
    if (import_fs.default.existsSync(TASKS_FILE)) {
      const data = import_fs.default.readFileSync(TASKS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Error reading server tasks file:", err);
  }
  return [];
}
function saveServerTasks(tasks) {
  try {
    import_fs.default.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
  } catch (err) {
    console.warn("Error saving server tasks file:", err);
  }
}
function loadSentAlerts() {
  try {
    if (import_fs.default.existsSync(SENT_ALERTS_FILE)) {
      const data = import_fs.default.readFileSync(SENT_ALERTS_FILE, "utf8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch (err) {
    console.warn("Error reading sent alerts file:", err);
  }
  return /* @__PURE__ */ new Set();
}
function saveSentAlerts(alertsSet) {
  try {
    import_fs.default.writeFileSync(SENT_ALERTS_FILE, JSON.stringify(Array.from(alertsSet)), "utf8");
  } catch (err) {
    console.warn("Error saving sent alerts file:", err);
  }
}
function loadServerNotifications() {
  try {
    if (import_fs.default.existsSync(NOTIFICATIONS_FILE)) {
      const data = import_fs.default.readFileSync(NOTIFICATIONS_FILE, "utf8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.warn("Error reading notifications file:", err);
  }
  return [];
}
function saveServerNotifications(notifs) {
  try {
    import_fs.default.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifs, null, 2), "utf8");
  } catch (err) {
    console.warn("Error saving notifications file:", err);
  }
}
function addServerNotification(notif) {
  try {
    const list = loadServerNotifications();
    if (!list.some((n) => n.id === notif.id)) {
      list.unshift(notif);
      saveServerNotifications(list.slice(0, 100));
    }
  } catch (err) {
    console.warn("Error adding server notification:", err);
  }
}
function getCambodiaDateFromIso(isoStr) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Phnom_Penh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
}
function getCambodiaDateStr(offsetDays = 0) {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1e3);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(target);
  const year = parts.find((p) => p.type === "year")?.value || "";
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}
function getTaskDueTimestamp(dateStr, timeStr) {
  if (!dateStr) return 0;
  const time = timeStr && timeStr.includes(":") ? timeStr.trim() : "08:00";
  const paddedTime = time.length === 5 ? time : time.padStart(5, "0");
  const isoStr = `${dateStr}T${paddedTime}:00+07:00`;
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
function checkTaskAdvanceAlert(dateStr, timeStr) {
  if (!dateStr) {
    return { shouldAlert: false, alertType: null, hoursRemaining: 0, isTomorrow: false, isToday: false, readableRemainingKhmer: "" };
  }
  const todayCambodia = getCambodiaDateStr(0);
  const tomorrowCambodia = getCambodiaDateStr(1);
  const isToday = dateStr === todayCambodia;
  const isTomorrow = dateStr === tomorrowCambodia;
  const taskTimeMs = getTaskDueTimestamp(dateStr, timeStr);
  const nowMs = Date.now();
  const diffMs = taskTimeMs - nowMs;
  const hoursRemaining = diffMs / (1e3 * 60 * 60);
  let readableRemainingKhmer = "";
  if (hoursRemaining > 24) {
    const days = Math.round(hoursRemaining / 24);
    readableRemainingKhmer = `\u1794\u17D2\u179A\u17A0\u17C2\u179B ${days} \u1790\u17D2\u1784\u17C3\u1791\u17C0\u178F`;
  } else if (hoursRemaining > 0) {
    const hrs = Math.floor(hoursRemaining);
    const mins = Math.round((hoursRemaining - hrs) * 60);
    readableRemainingKhmer = hrs > 0 ? `\u179F\u179B\u17CB ${hrs} \u1798\u17C9\u17C4\u1784 ${mins} \u1793\u17B6\u1791\u17B8\u1791\u17C0\u178F` : `\u179F\u179B\u17CB ${mins} \u1793\u17B6\u1791\u17B8\u1791\u17C0\u178F`;
  } else if (hoursRemaining >= -2) {
    readableRemainingKhmer = `\u178A\u179B\u17CB\u1796\u17C1\u179B\u179C\u17C1\u179B\u17B6\u1780\u17C6\u178E\u178F\u17CB\u17A0\u17BE\u1799`;
  } else {
    readableRemainingKhmer = `\u17A0\u17BD\u179F\u1780\u17B6\u179B\u1780\u17C6\u178E\u178F\u17CB`;
  }
  let shouldAlert = false;
  let alertType = null;
  if (isTomorrow) {
    shouldAlert = true;
    alertType = "one_day_before";
  } else if (hoursRemaining <= 24 && hoursRemaining >= -2) {
    shouldAlert = true;
    alertType = isToday ? "due_today" : "twenty_four_hours";
  } else if (isToday) {
    shouldAlert = true;
    alertType = "due_today";
  }
  return { shouldAlert, alertType, hoursRemaining, isTomorrow, isToday, readableRemainingKhmer };
}
function isTaskDueTomorrow(dateStr) {
  if (!dateStr) return false;
  const tomorrowStr = getCambodiaDateStr(1);
  if (dateStr === tomorrowStr) return true;
  const todayCambodia = getCambodiaDateStr(0);
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const todayParts = todayCambodia.split("-");
    const d1 = new Date(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10));
    const d2 = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const diffMs = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1e3));
    return diffDays === 1;
  }
  return false;
}
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function buildReminderMessage(task, remainingText) {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === "High" ? "\u{1F534}" : task.priority === "Medium" ? "\u{1F7E1}" : "\u{1F7E2}";
  const safeTaskTitle = escapeHtml(task.task || "Untitled Task");
  const formattedTitle = `<i>${safeTaskTitle}</i>`;
  if (isKhmer) {
    const priorityKh = task.priority === "High" ? "\u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB" : task.priority === "Medium" ? "\u1798\u1792\u17D2\u1799\u1798" : "\u1798\u17B7\u1793\u179F\u17BC\u179C\u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB";
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    return `<b>\u{1F514} \u179F\u17C1\u1785\u1780\u17D2\u178F\u17B8\u179A\u17C6\u179B\u17B9\u1780\u1796\u17B8\u1780\u17B6\u179A\u1784\u17B6\u179A\u178A\u17C2\u179B\u178F\u17D2\u179A\u17BC\u179C\u1794\u17C6\u1796\u17C1\u1789 (\u17E1 \u1790\u17D2\u1784\u17C3\u1798\u17BB\u1793 / \u17E2\u17E4 \u1798\u17C9\u17C4\u1784\u1798\u17BB\u1793)</b>

\u179F\u17BD\u179F\u17D2\u178F\u17B8\u179B\u17C4\u1780 \u1780\u17B6\u17A0\u17D2\u179C\u17B6, \u1793\u17C1\u17C7\u1787\u17B6\u1780\u17B6\u179A\u179A\u17C6\u179B\u17B9\u1780 \u17E1 \u1790\u17D2\u1784\u17C3\u1798\u17BB\u1793 \u17AC \u17E2\u17E4 \u1798\u17C9\u17C4\u1784\u1798\u17BB\u1793\u1796\u17C1\u179B\u1798\u1780\u178A\u179B\u17CB \u1793\u17C3\u1797\u17B6\u179A\u1780\u17B7\u1785\u17D2\u1785\u178A\u17C2\u179B\u178F\u17D2\u179A\u17BC\u179C\u1794\u17C6\u1796\u17C1\u1789 (24/7 Cloud Background Worker)\u17D6

\u{1F4CB} <b>\u1794\u17D2\u179A\u1792\u17B6\u1793\u1794\u1791\u17D6</b> ${formattedTitle}
\u{1F4C5} <b>\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791\u17D6</b> <code>${task.date || "--"}</code>
\u{1F552} <b>\u1796\u17C1\u179B\u179C\u17C1\u179B\u17B6\u17D6</b> <code>${task.time || "--:--"}</code>
\u26A1 <b>\u1780\u1798\u17D2\u179A\u17B7\u178F\u17A2\u17B6\u1791\u17B7\u1797\u17B6\u1796\u17D6</b> ${statusText}
` + (remainingText ? `\u23F3 <b>\u1796\u17C1\u179B\u179C\u17C1\u179B\u17B6\u1793\u17C5\u179F\u179B\u17CB\u17D6</b> <code>${remainingText}</code>

` : `
`) + `\u179F\u17BC\u1798\u17A2\u179A\u1782\u17BB\u178E!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || "Medium"}</b>`;
    return `<b>\u23F0 24-HOUR / 1-DAY ADVANCE TASK REMINDER</b>

Hello Mr. Kafa, this is your 24-hour advance reminder for scheduled task (24/7 Cloud Background Worker):

\u{1F4CB} <b>Title:</b> ${formattedTitle}
\u{1F4C5} <b>Date:</b> <code>${task.date || "--"}</code>
\u{1F552} <b>Scheduled Time:</b> <code>${task.time || "--:--"}</code>
\u26A1 <b>Priority:</b> ${statusText}

Thank you!`;
  }
}
function buildTodayReminderMessage(task) {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === "High" ? "\u{1F534}" : task.priority === "Medium" ? "\u{1F7E1}" : "\u{1F7E2}";
  const safeTaskTitle = escapeHtml(task.task || "Untitled Task");
  const formattedTitle = `<i>${safeTaskTitle}</i>`;
  if (isKhmer) {
    const priorityKh = task.priority === "High" ? "\u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB" : task.priority === "Medium" ? "\u1798\u1792\u17D2\u1799\u1798" : "\u1798\u17B7\u1793\u179F\u17BC\u179C\u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB";
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    return `<b>\u23F0 \u179F\u17C1\u1785\u1780\u17D2\u178F\u17B8\u179A\u17C6\u179B\u17B9\u1780\u1796\u17B8\u1780\u17B6\u179A\u1784\u17B6\u179A\u178A\u17C2\u179B\u178F\u17D2\u179A\u17BC\u179C\u1794\u17C6\u1796\u17C1\u1789 (\u1790\u17D2\u1784\u17C3\u1793\u17C1\u17C7 / Today)</b>

\u179F\u17BD\u179F\u17D2\u178F\u17B8\u179B\u17C4\u1780 \u1780\u17B6\u17A0\u17D2\u179C\u17B6, \u1793\u17C1\u17C7\u1787\u17B6\u1780\u17B6\u179A\u179A\u17C6\u179B\u17B9\u1780\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178A\u17C2\u179B\u178F\u17D2\u179A\u17BC\u179C\u1794\u17C6\u1796\u17C1\u1789\u1793\u17C5\u1790\u17D2\u1784\u17C3\u1793\u17C1\u17C7 (\u1795\u17D2\u1789\u17BE\u179F\u17D2\u179C\u17D0\u1799\u1794\u17D2\u179A\u179C\u178F\u17D2\u178F\u17B7\u178F\u17B6\u1798\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792 24/7 Cloud Background Worker)\u17D6

\u{1F4CB} <b>\u1794\u17D2\u179A\u1792\u17B6\u1793\u1794\u1791\u17D6</b> ${formattedTitle}
\u{1F4C5} <b>\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791\u17D6</b> <code>${task.date || "--"}</code>
\u{1F552} <b>\u1796\u17C1\u179B\u179C\u17C1\u179B\u17B6\u1780\u17C6\u178E\u178F\u17CB\u17D6</b> <code>${task.time || "--:--"}</code>
\u26A1 <b>\u1780\u1798\u17D2\u179A\u17B7\u178F\u17A2\u17B6\u1791\u17B7\u1797\u17B6\u1796\u17D6</b> ${statusText}

\u179F\u17BC\u1798\u17A2\u179A\u1782\u17BB\u178E!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || "Medium"}</b>`;
    return `<b>\u23F0 TASK DUE TODAY REMINDER</b>

Hello Mr. Kafa, this is your reminder for today's scheduled task (24/7 Cloud Background Worker):

\u{1F4CB} <b>Title:</b> ${formattedTitle}
\u{1F4C5} <b>Date:</b> <code>${task.date || "--"}</code>
\u{1F552} <b>Scheduled Time:</b> <code>${task.time || "--:--"}</code>
\u26A1 <b>Priority:</b> ${statusText}

Thank you!`;
  }
}
function isOneDayPostCompletion(completedAt) {
  if (!completedAt) return false;
  try {
    const completedDate = new Date(completedAt);
    if (isNaN(completedDate.getTime())) return false;
    const now = Date.now();
    const elapsedMs = now - completedDate.getTime();
    const elapsedHours = elapsedMs / (1e3 * 60 * 60);
    if (elapsedHours >= 24) return true;
    const completedCambodia = getCambodiaDateFromIso(completedAt);
    const todayCambodia = getCambodiaDateStr(0);
    if (completedCambodia && todayCambodia) {
      const p1 = completedCambodia.split("-");
      const p2 = todayCambodia.split("-");
      if (p1.length === 3 && p2.length === 3) {
        const d1 = new Date(parseInt(p1[0], 10), parseInt(p1[1], 10) - 1, parseInt(p1[2], 10));
        const d2 = new Date(parseInt(p2[0], 10), parseInt(p2[1], 10) - 1, parseInt(p2[2], 10));
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1e3));
        if (diffDays >= 1) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
function buildPostCompletedMessage(task) {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task || "");
  const safeTaskTitle = escapeHtml(task.task || "Untitled Task");
  const formattedTitle = `<i>${safeTaskTitle}</i>`;
  let compTimeStr = "--";
  if (task.completedAt) {
    try {
      const d = new Date(task.completedAt);
      compTimeStr = new Intl.DateTimeFormat("km-KH", {
        timeZone: "Asia/Phnom_Penh",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(d);
    } catch {
      compTimeStr = task.completedAt;
    }
  }
  const priorityKh = task.priority === "High" ? "\u{1F534} \u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB (High)" : task.priority === "Medium" ? "\u{1F7E1} \u1798\u1792\u17D2\u1799\u1798 (Medium)" : "\u{1F7E2} \u1792\u1798\u17D2\u1798\u178F\u17B6 (Low)";
  if (isKhmer) {
    return `<b>\u2705 \u1780\u17B6\u179A\u1787\u17BC\u1793\u178A\u17C6\u178E\u17B9\u1784\u17D6 \u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178A\u17C2\u179B\u1794\u17B6\u1793\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785 (\u179A\u17C6\u179B\u1784\u1794\u17B6\u1793 \u17E1 \u1790\u17D2\u1784\u17C3)</b>

\u179F\u17BD\u179F\u17D2\u178F\u17B8\u179B\u17C4\u1780 \u1780\u17B6\u17A0\u17D2\u179C\u17B6, \u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u1781\u17B6\u1784\u1780\u17D2\u179A\u17C4\u1798\u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u17A2\u17D2\u1793\u1780\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785\u179A\u17B6\u179B\u17CB\u179A\u17C6\u179B\u1784\u1794\u17B6\u1793 \u17E1 \u1790\u17D2\u1784\u17C3\u17A0\u17BE\u1799 (\u1795\u17D2\u1789\u17BE\u179F\u17D2\u179C\u17D0\u1799\u1794\u17D2\u179A\u179C\u178F\u17D2\u178F\u17B7\u178F\u17B6\u1798\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792 24/7 Cloud Background Worker)\u17D6

\u{1F4CB} <b>\u1794\u17D2\u179A\u1792\u17B6\u1793\u1794\u1791\u17D6</b> ${formattedTitle}
\u{1F4C5} <b>\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785\u17D6</b> <code>${compTimeStr}</code>
\u26A1 <b>\u1780\u1798\u17D2\u179A\u17B7\u178F\u17A2\u17B6\u1791\u17B7\u1797\u17B6\u1796\u17D6</b> ${priorityKh}
\u{1F389} <b>\u179F\u17D2\u1790\u17B6\u1793\u1797\u17B6\u1796\u17D6</b> \u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785\u179A\u17B6\u179B\u17CB \u17E1\u17E0\u17E0% (Completed)
\u{1F4C2} <b>\u1780\u1793\u17D2\u179B\u17C2\u1784\u1795\u17D2\u1791\u17BB\u1780\u17D6</b> \u1794\u17B6\u1793\u179A\u1780\u17D2\u179F\u17B6\u1791\u17BB\u1780\u178A\u17C4\u1799\u17A1\u17C2\u1780\u1780\u17D2\u1793\u17BB\u1784 \xAB\u1780\u1793\u17D2\u179B\u17C2\u1784\u1795\u17D2\u1791\u17BB\u1780\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178A\u17C2\u179B\u1794\u17B6\u1793\u1794\u17C6\u1796\u17C1\u1789\u17A0\u17BE\u1799\xBB (Completed Tasks Repository)

\u179F\u17BC\u1798\u17A2\u179A\u1782\u17BB\u178E \u1793\u17B7\u1784\u179F\u17BC\u1798\u1787\u17BC\u1793\u1796\u179A\u17B1\u17D2\u1799\u179F\u1798\u17D2\u179A\u17C1\u1785\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u1794\u1793\u17D2\u1791\u17B6\u1794\u17CB\u17D7\u1794\u17B6\u1793\u1780\u17B6\u1793\u17CB\u178F\u17C2\u179A\u179B\u17BC\u1793!`;
  } else {
    return `<b>\u2705 COMPLETED TASK FOLLOW-UP (1 Day Post-Completion)</b>

Hello Mr. Kafa, the following task was completed 1 day ago (24/7 Cloud Background Worker):

\u{1F4CB} <b>Title:</b> ${formattedTitle}
\u{1F4C5} <b>Completed At:</b> <code>${compTimeStr}</code>
\u26A1 <b>Priority:</b> ${task.priority || "Medium"}
\u{1F389} <b>Status:</b> 100% Completed
\u{1F4C2} <b>Storage Hub:</b> Stored in Completed Tasks Repository

Thank you!`;
  }
}
async function sendTelegramRaw(text) {
  const telegramUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  try {
    let response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        parse_mode: "HTML"
      })
    });
    if (!response.ok) {
      const plainText = text.replace(/<[^>]*>/g, "");
      response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: plainText
        })
      });
    }
    return response.ok;
  } catch (err) {
    console.error("sendTelegramRaw error:", err);
    return false;
  }
}
var sentAlertsMemory = loadSentAlerts();
var lastWorkerCheckTime = (/* @__PURE__ */ new Date()).toISOString();
async function checkAndSendReminders() {
  lastWorkerCheckTime = (/* @__PURE__ */ new Date()).toISOString();
  let sentCount = 0;
  const sentTitles = [];
  const localTasks = loadServerTasks();
  const taskMap = /* @__PURE__ */ new Map();
  for (const t of localTasks) {
    if (t && t.id) taskMap.set(t.id, t);
  }
  const db = getServerFirestore();
  if (db) {
    try {
      const q = (0, import_firestore.query)((0, import_firestore.collection)(db, "tasks"), (0, import_firestore.where)("status", "==", "Pending"));
      const snapshot = await (0, import_firestore.getDocs)(q);
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.id) {
          taskMap.set(d.id, { ...taskMap.get(d.id), ...d });
        }
      });
    } catch (err) {
      console.warn("[Reminder Worker] Firestore query note (using server tasks cache):", err?.message || err);
    }
  }
  const allTasks = Array.from(taskMap.values());
  for (const t of allTasks) {
    if (t.status === "Pending" && t.date) {
      const advAlert = checkTaskAdvanceAlert(t.date, t.time);
      if (advAlert.shouldAlert && !t.telegramNotified) {
        const alertKey = `tg_alert_${t.id}_${t.date}`;
        if (!sentAlertsMemory.has(alertKey)) {
          console.log(`[24/7 Worker] Task due within 24h / tomorrow (${t.date} ${t.time || ""}): "${t.task}" (ID: ${t.id}). Dispatching 24h Telegram reminder...`);
          const messageText = buildReminderMessage(t, advAlert.readableRemainingKhmer);
          const sent = await sendTelegramRaw(messageText);
          if (sent) {
            sentAlertsMemory.add(alertKey);
            saveSentAlerts(sentAlertsMemory);
            sentCount++;
            sentTitles.push(`${t.task} (${advAlert.isTomorrow ? "Tomorrow" : "24h Advance"})`);
            t.telegramNotified = true;
            if (advAlert.isToday) t.telegramTodayNotified = true;
            taskMap.set(t.id, t);
            if (db) {
              try {
                const taskRef = (0, import_firestore.doc)(db, "tasks", t.id);
                await (0, import_firestore.updateDoc)(taskRef, {
                  telegramNotified: true,
                  telegramNotifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
                  ...advAlert.isToday ? { telegramTodayNotified: true } : {}
                }).catch(() => {
                });
                const alertLockRef = (0, import_firestore.doc)(db, "telegram_sent_alerts", alertKey);
                await (0, import_firestore.setDoc)(alertLockRef, {
                  sent: true,
                  sentAt: (/* @__PURE__ */ new Date()).toISOString(),
                  taskId: t.id,
                  taskTitle: t.task,
                  type: advAlert.alertType || "twenty_four_hours",
                  source: "server_24_7_worker"
                }).catch(() => {
                });
              } catch (err) {
                console.warn("Could not update Firestore notification flag:", err);
              }
            }
          }
        }
      }
      if (advAlert.isToday && !t.telegramTodayNotified) {
        const alertKeyToday = `tg_alert_today_${t.id}_${t.date}`;
        if (!sentAlertsMemory.has(alertKeyToday)) {
          console.log(`[24/7 Worker] Found task due today (${t.date}): "${t.task}" (ID: ${t.id}). Dispatching Telegram today reminder...`);
          const messageText = buildTodayReminderMessage(t);
          const sent = await sendTelegramRaw(messageText);
          if (sent) {
            sentAlertsMemory.add(alertKeyToday);
            saveSentAlerts(sentAlertsMemory);
            sentCount++;
            sentTitles.push(`${t.task} (Today)`);
            t.telegramTodayNotified = true;
            taskMap.set(t.id, t);
            if (db) {
              try {
                const taskRef = (0, import_firestore.doc)(db, "tasks", t.id);
                await (0, import_firestore.updateDoc)(taskRef, { telegramTodayNotified: true }).catch(() => {
                });
                const alertLockRef = (0, import_firestore.doc)(db, "telegram_sent_alerts", alertKeyToday);
                await (0, import_firestore.setDoc)(alertLockRef, {
                  sent: true,
                  sentAt: (/* @__PURE__ */ new Date()).toISOString(),
                  taskId: t.id,
                  taskTitle: t.task,
                  type: "due_today",
                  source: "server_24_7_worker"
                }).catch(() => {
                });
              } catch (err) {
                console.warn("Could not update Firestore today notification flag:", err);
              }
            }
          }
        }
      }
    }
    if (t.status === "Completed" && t.completedAt) {
      if (isOneDayPostCompletion(t.completedAt)) {
        const postAlertKey = `tg_alert_post_comp_1day_${t.id}`;
        if (!sentAlertsMemory.has(postAlertKey) && !t.telegramPostCompletedNotified) {
          console.log(`[24/7 Worker] Found completed task with 1-day milestone reached (${t.completedAt}): "${t.task}" (ID: ${t.id}). Dispatching Telegram & System auto-message...`);
          const messageText = buildPostCompletedMessage(t);
          const sent = await sendTelegramRaw(messageText);
          if (sent) {
            sentAlertsMemory.add(postAlertKey);
            saveSentAlerts(sentAlertsMemory);
            sentCount++;
            sentTitles.push(`${t.task} (Completed +1 Day)`);
            t.telegramPostCompletedNotified = true;
            t.systemNotifiedPostCompleted = true;
            t.isArchived = true;
            taskMap.set(t.id, t);
            addServerNotification({
              id: `notif_post_comp_${t.id}`,
              taskId: t.id,
              taskTitle: t.task,
              type: "post_completed_1day",
              title: `\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u1794\u17B6\u1793\u1794\u17C6\u1796\u17C1\u1789\u179A\u17C6\u179B\u1784 \u17E1 \u1790\u17D2\u1784\u17C3\u17D6 ${t.task}`,
              message: `\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A \xAB${t.task}\xBB \u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u17A2\u17D2\u1793\u1780\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785\u179A\u17B6\u179B\u17CB\u179A\u17C6\u179B\u1784\u1794\u17B6\u1793 \u17E1 \u1790\u17D2\u1784\u17C3\u17A0\u17BE\u1799\u17D4 \u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1794\u17B6\u1793\u179A\u1780\u17D2\u179F\u17B6\u1791\u17BB\u1780\u1780\u17D2\u1793\u17BB\u1784\u1780\u1793\u17D2\u179B\u17C2\u1784\u1795\u17D2\u1791\u17BB\u1780\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178A\u17C2\u179B\u1794\u17B6\u1793\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785 \u1793\u17B7\u1784\u1794\u17B6\u1793\u1795\u17D2\u1789\u17BE\u179F\u17B6\u179A\u17A2\u17BC\u178F\u17BC\u1791\u17C5\u1780\u17B6\u1793\u17CB Telegram \u179A\u17BD\u1785\u179A\u17B6\u179B\u17CB\u17D4`,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              read: false
            });
            if (db) {
              try {
                const taskRef = (0, import_firestore.doc)(db, "tasks", t.id);
                await (0, import_firestore.updateDoc)(taskRef, {
                  telegramPostCompletedNotified: true,
                  systemNotifiedPostCompleted: true,
                  isArchived: true
                }).catch(() => {
                });
                const alertLockRef = (0, import_firestore.doc)(db, "telegram_sent_alerts", postAlertKey);
                await (0, import_firestore.setDoc)(alertLockRef, {
                  sent: true,
                  sentAt: (/* @__PURE__ */ new Date()).toISOString(),
                  taskId: t.id,
                  taskTitle: t.task,
                  type: "post_completed_1day",
                  source: "server_24_7_worker"
                }).catch(() => {
                });
              } catch (err) {
                console.warn("Could not update Firestore post-completion alert flag:", err);
              }
            }
          }
        }
      }
    }
  }
  if (sentCount > 0) {
    saveServerTasks(Array.from(taskMap.values()));
    console.log(`[24/7 Worker] Successfully sent ${sentCount} Telegram reminder(s): ${sentTitles.join(", ")}`);
  }
  return { checked: allTasks.length, sent: sentCount, alerts: sentTitles };
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { text, taskId } = req.body;
      if (!text) {
        res.status(400).json({ error: "Missing message text" });
        return;
      }
      if (taskId) {
        if (sentAlertsMemory.has(taskId)) {
          console.log(`[Deduplication] Blocked duplicate Telegram alert for task ID: ${taskId}`);
          res.json({ success: true, duplicated: true });
          return;
        }
        sentAlertsMemory.add(taskId);
        saveSentAlerts(sentAlertsMemory);
      }
      const success = await sendTelegramRaw(text);
      if (!success) {
        if (taskId) sentAlertsMemory.delete(taskId);
        res.status(502).json({ error: "Telegram API failed" });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending message to Telegram:", error);
      if (req.body.taskId) {
        sentAlertsMemory.delete(req.body.taskId);
      }
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });
  app.post("/api/telegram/test-server", async (req, res) => {
    try {
      const cambodiaToday = getCambodiaDateStr(0);
      const testMsg = `<b>\u{1F514} 24/7 Cloud Background Worker Test</b>

\u2705 Telegram notifications are actively functioning from the server.
\u{1F4C5} Cambodia Date: <code>${cambodiaToday}</code>
\u{1F310} Timezone: Asia/Phnom_Penh (UTC+7)
\u{1F680} Status: Running 24/7 even when browser or device is closed.`;
      const sent = await sendTelegramRaw(testMsg);
      res.json({ success: sent });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to send test alert" });
    }
  });
  app.post("/api/tasks/sync", (req, res) => {
    try {
      const { tasks } = req.body;
      if (Array.isArray(tasks)) {
        saveServerTasks(tasks);
        checkAndSendReminders().catch(() => {
        });
        res.json({ success: true, count: tasks.length });
        return;
      }
      res.status(400).json({ error: "Invalid tasks array" });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Sync failed" });
    }
  });
  app.get("/api/reminders/status", (req, res) => {
    const cambodiaToday = getCambodiaDateStr(0);
    const cambodiaTomorrow = getCambodiaDateStr(1);
    const tasks = loadServerTasks();
    const pendingDueTomorrow = tasks.filter((t) => t.status === "Pending" && isTaskDueTomorrow(t.date));
    const completedTasks = tasks.filter((t) => t.status === "Completed");
    const completed1DayNotified = completedTasks.filter((t) => t.telegramPostCompletedNotified);
    res.json({
      active: true,
      service: "24/7 Background Telegram Reminder Worker",
      timezone: "Asia/Phnom_Penh (UTC+7)",
      cambodiaToday,
      cambodiaTomorrow,
      lastCheck: lastWorkerCheckTime,
      monitoredTasksCount: tasks.length,
      pendingCount: tasks.filter((t) => t.status === "Pending").length,
      completedCount: completedTasks.length,
      completed1DayNotifiedCount: completed1DayNotified.length,
      pendingDueTomorrowCount: pendingDueTomorrow.length,
      totalRemindersSent: sentAlertsMemory.size
    });
  });
  app.post("/api/reminders/check-now", async (req, res) => {
    try {
      const result = await checkAndSendReminders();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Manual check failed" });
    }
  });
  app.get("/api/notifications", (req, res) => {
    try {
      const list = loadServerNotifications();
      res.json({ success: true, notifications: list });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to load notifications" });
    }
  });
  app.post("/api/notifications/mark-read", (req, res) => {
    try {
      const { id, all } = req.body;
      let list = loadServerNotifications();
      if (all) {
        list = list.map((n) => ({ ...n, read: true }));
      } else if (id) {
        list = list.map((n) => n.id === id ? { ...n, read: true } : n);
      }
      saveServerNotifications(list);
      res.json({ success: true, count: list.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to mark notifications read" });
    }
  });
  app.post("/api/notifications/clear", (req, res) => {
    try {
      saveServerNotifications([]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to clear notifications" });
    }
  });
  app.post("/api/telegram/send-post-completed", async (req, res) => {
    try {
      const { taskId, task } = req.body;
      let targetTask = task;
      if (!targetTask && taskId) {
        const tasks = loadServerTasks();
        targetTask = tasks.find((t) => t.id === taskId);
      }
      if (!targetTask) {
        res.status(404).json({ success: false, error: "Task not found" });
        return;
      }
      const msg = buildPostCompletedMessage(targetTask);
      const sent = await sendTelegramRaw(msg);
      if (sent) {
        const postAlertKey = `tg_alert_post_comp_1day_${targetTask.id}`;
        sentAlertsMemory.add(postAlertKey);
        saveSentAlerts(sentAlertsMemory);
        const tasks = loadServerTasks();
        const idx = tasks.findIndex((t) => t.id === targetTask.id);
        if (idx >= 0) {
          tasks[idx].telegramPostCompletedNotified = true;
          tasks[idx].systemNotifiedPostCompleted = true;
          saveServerTasks(tasks);
        }
        addServerNotification({
          id: `notif_post_comp_${targetTask.id}_${Date.now()}`,
          taskId: targetTask.id,
          taskTitle: targetTask.task,
          type: "post_completed_1day",
          title: `\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u1794\u17B6\u1793\u1794\u17C6\u1796\u17C1\u1789\u179A\u17C6\u179B\u1784 \u17E1 \u1790\u17D2\u1784\u17C3\u17D6 ${targetTask.task}`,
          message: `\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A \xAB${targetTask.task}\xBB \u178F\u17D2\u179A\u17BC\u179C\u1794\u17B6\u1793\u17A2\u17D2\u1793\u1780\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785\u179A\u17B6\u179B\u17CB\u179A\u17C6\u179B\u1784\u1794\u17B6\u1793 \u17E1 \u1790\u17D2\u1784\u17C3\u17A0\u17BE\u1799\u17D4 \u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792\u1794\u17B6\u1793\u179A\u1780\u17D2\u179F\u17B6\u1791\u17BB\u1780\u1780\u17D2\u1793\u17BB\u1784\u1780\u1793\u17D2\u179B\u17C2\u1784\u1795\u17D2\u1791\u17BB\u1780\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178A\u17C2\u179B\u1794\u17B6\u1793\u1794\u17C6\u1796\u17C1\u1789\u179A\u17BD\u1785 \u1793\u17B7\u1784\u1794\u17B6\u1793\u1795\u17D2\u1789\u17BE\u179F\u17B6\u179A\u17A2\u17BC\u178F\u17BC\u1791\u17C5\u1780\u17B6\u1793\u17CB Telegram \u179A\u17BD\u1785\u179A\u17B6\u179B\u17CB\u17D4`,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          read: false
        });
        const db = getServerFirestore();
        if (db) {
          try {
            const taskRef = (0, import_firestore.doc)(db, "tasks", targetTask.id);
            await (0, import_firestore.updateDoc)(taskRef, {
              telegramPostCompletedNotified: true,
              systemNotifiedPostCompleted: true
            }).catch(() => {
            });
          } catch {
          }
        }
        res.json({ success: true, message: "1-Day Completed notification dispatched to Telegram and System" });
        return;
      }
      res.status(502).json({ success: false, error: "Telegram dispatch failed" });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to trigger post-completed notification" });
    }
  });
  const DEFAULT_SHEETS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxHFlm4VHzj2geAjaAzkaRSxOgbScGDEvqrkpJoq2O_TXHLiUY25J9DLt5UfF8IuP41SA/exec";
  app.post("/api/sheets/sync", async (req, res) => {
    try {
      const { url, payload } = req.body;
      let targetUrl = url || process.env.GOOGLE_SHEETS_SCRIPT_URL || DEFAULT_SHEETS_SCRIPT_URL;
      const isDelete = payload && (payload.action === "delete" || payload.isDelete || payload.method === "delete");
      if (isDelete) {
        const sep = targetUrl.includes("?") ? "&" : "?";
        const q = new URLSearchParams({
          action: "delete",
          id: String(payload.id || payload.taskId || ""),
          task: String(payload.task || payload.title || payload.name || "")
        }).toString();
        targetUrl = `${targetUrl}${sep}${q}`;
      }
      if (payload) {
        try {
          const currentTasks = loadServerTasks();
          if (payload.action === "add" || payload.action === "update") {
            const idx = currentTasks.findIndex((t) => t.id === payload.id);
            if (idx >= 0) {
              currentTasks[idx] = { ...currentTasks[idx], ...payload };
            } else {
              currentTasks.push(payload);
            }
            saveServerTasks(currentTasks);
            checkAndSendReminders().catch(() => {
            });
          } else if (payload.action === "delete") {
            const filtered = currentTasks.filter((t) => t.id !== payload.id && t.task !== payload.task);
            saveServerTasks(filtered);
          } else if (payload.action === "batch_sync" && Array.isArray(payload.tasks)) {
            saveServerTasks(payload.tasks);
            checkAndSendReminders().catch(() => {
            });
          }
        } catch (syncCacheErr) {
          console.warn("Could not cache task from sheets sync:", syncCacheErr);
        }
      }
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || req.body),
        redirect: "follow"
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error syncing with Google Sheets backend:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to sync with Google Sheets" });
    }
  });
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, jsonSchema } = req.body;
      if (!prompt) {
        res.status(400).json({ error: "Missing prompt" });
        return;
      }
      const clientKey = req.headers["x-gemini-key"];
      const apiKeysToTry = [];
      if (clientKey) {
        apiKeysToTry.push(clientKey);
      }
      if (process.env.GEMINI_API_KEY && !apiKeysToTry.includes(process.env.GEMINI_API_KEY)) {
        apiKeysToTry.push(process.env.GEMINI_API_KEY);
      }
      if (apiKeysToTry.length === 0) {
        res.status(401).json({
          error: "Gemini API key is required. Please ensure your Gemini API key is configured."
        });
        return;
      }
      const modelsToTry = [
        "gemini-3.6-flash"
      ];
      let lastError = null;
      let responseText = "";
      let success = false;
      const configAttempts = [];
      const baseConfig = {};
      if (systemInstruction) {
        baseConfig.systemInstruction = systemInstruction;
      }
      if (jsonSchema) {
        configAttempts.push({
          ...baseConfig,
          responseMimeType: "application/json",
          responseSchema: jsonSchema
        });
        configAttempts.push({
          ...baseConfig,
          responseMimeType: "application/json"
        });
      }
      configAttempts.push(baseConfig);
      for (const keyToUse of apiKeysToTry) {
        if (success) break;
        const ai = new import_genai.GoogleGenAI({
          apiKey: keyToUse,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            },
            timeout: 12e3
          }
        });
        let keyDenied = false;
        for (const configAttempt of configAttempts) {
          if (success || keyDenied) break;
          for (const model of modelsToTry) {
            try {
              const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: configAttempt
              });
              if (response && response.text) {
                responseText = response.text;
                success = true;
                break;
              }
            } catch (err) {
              const errMsg = err?.message || String(err);
              console.warn(`Gemini API error for model ${model}:`, errMsg);
              lastError = err;
              if (errMsg.includes("403") || errMsg.includes("denied access") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API key not valid")) {
                keyDenied = true;
                break;
              }
            }
          }
        }
      }
      if (!success) {
        throw lastError || new Error("All fallback models failed to generate content.");
      }
      res.json({ text: responseText });
    } catch (error) {
      console.error("Gemini AI API calling error:", error);
      res.status(500).json({ error: error?.message || "Generative request failed" });
    }
  });
  const isProduction = process.env.NODE_ENV === "production" || typeof __dirname !== "undefined" && __dirname.includes("dist") || !process.argv.some((arg) => arg.includes("server.ts"));
  if (isProduction) {
    const distPath = typeof __dirname !== "undefined" && import_fs.default.existsSync(import_path.default.join(__dirname, "index.html")) ? __dirname : import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = import_path.default.join(distPath, "index.html");
      if (import_fs.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("Daily Task Management API Server is running.");
      }
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const primaryPort = isProduction ? process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3 : 3e3;
  const secondaryPort = primaryPort === 3e3 && process.env.PORT && parseInt(process.env.PORT, 10) !== 3e3 ? parseInt(process.env.PORT, 10) : primaryPort !== 3e3 ? 3e3 : null;
  let workerStarted = false;
  const startBackgroundWorker = () => {
    if (workerStarted) return;
    workerStarted = true;
    console.log(`[24/7 Cloud Worker] Initializing background task reminder service for Cambodia (UTC+7)...`);
    setTimeout(() => {
      checkAndSendReminders().catch((err) => console.error("Initial reminder check error:", err));
    }, 3e3);
    setInterval(() => {
      checkAndSendReminders().catch((err) => console.error("Background reminder interval error:", err));
    }, 30 * 1e3);
  };
  try {
    const primaryServer = app.listen(primaryPort, "0.0.0.0", () => {
      console.log(`[Server] Primary listener running on http://0.0.0.0:${primaryPort} (${isProduction ? "production" : "development"})`);
      startBackgroundWorker();
    });
    primaryServer.on("error", (err) => {
      console.warn(`[Server] Primary listener note on port ${primaryPort}: ${err.message}`);
    });
  } catch (err) {
    console.warn(`[Server] Could not initialize primary listener on port ${primaryPort}: ${err.message}`);
  }
  if (secondaryPort && secondaryPort !== primaryPort) {
    try {
      const secondaryServer = app.listen(secondaryPort, "0.0.0.0", () => {
        console.log(`[Server] Auxiliary listener running on http://0.0.0.0:${secondaryPort}`);
        startBackgroundWorker();
      });
      secondaryServer.on("error", (err) => {
        console.log(`[Server] Auxiliary port ${secondaryPort} binding note: ${err.message}`);
      });
    } catch (err) {
      console.log(`[Server] Auxiliary port ${secondaryPort} note: ${err?.message || err}`);
    }
  }
}
startServer();
//# sourceMappingURL=server.cjs.map
