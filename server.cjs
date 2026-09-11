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
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var TG_BOT_TOKEN = "8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g";
var TG_CHAT_ID = "-1004222754940";
var DATA_DIR = import_path.default.join(process.cwd(), "data");
if (!import_fs.default.existsSync(DATA_DIR)) {
  try {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create data directory:", err);
  }
}
var TASKS_FILE = import_path.default.join(DATA_DIR, "server_tasks.json");
var SENT_ALERTS_FILE = import_path.default.join(DATA_DIR, "sent_alerts.json");
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
function buildReminderMessage(task) {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === "High" ? "\u{1F534}" : task.priority === "Medium" ? "\u{1F7E1}" : "\u{1F7E2}";
  const safeTaskTitle = escapeHtml(task.task || "Untitled Task");
  const formattedTitle = `<i>${safeTaskTitle}</i>`;
  if (isKhmer) {
    const priorityKh = task.priority === "High" ? "\u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB" : task.priority === "Medium" ? "\u1798\u1792\u17D2\u1799\u1798" : "\u1798\u17B7\u1793\u179F\u17BC\u179C\u1794\u1793\u17D2\u1791\u17B6\u1793\u17CB";
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    return `<b>\u{1F514} \u179F\u17C1\u1785\u1780\u17D2\u178F\u17B8\u179A\u17C6\u179B\u17B9\u1780\u1796\u17B8\u1780\u17B6\u179A\u1784\u17B6\u179A\u178A\u17C2\u179B\u178F\u17D2\u179A\u17BC\u179C\u1794\u17C6\u1796\u17C1\u1789 (\u17E1 \u1790\u17D2\u1784\u17C3\u1798\u17BB\u1793)</b>

\u179F\u17BD\u179F\u17D2\u178F\u17B8\u179B\u17C4\u1780 \u1780\u17B6\u17A0\u17D2\u179C\u17B6, \u1793\u17C1\u17C7\u1787\u17B6\u1780\u17B6\u179A\u179A\u17C6\u179B\u17B9\u1780 \u17E1 \u1790\u17D2\u1784\u17C3\u1798\u17BB\u1793 \u179F\u1798\u17D2\u179A\u17B6\u1794\u17CB\u1780\u17B7\u1785\u17D2\u1785\u1780\u17B6\u179A\u178A\u17C2\u179B\u178F\u17D2\u179A\u17BC\u179C\u1794\u17C6\u1796\u17C1\u1789\u1793\u17C5\u1790\u17D2\u1784\u17C3\u179F\u17D2\u17A2\u17C2\u1780 (\u1795\u17D2\u1789\u17BE\u179F\u17D2\u179C\u17D0\u1799\u1794\u17D2\u179A\u179C\u178F\u17D2\u178F\u17B7\u178F\u17B6\u1798\u1794\u17D2\u179A\u1796\u17D0\u1793\u17D2\u1792 24/7 Cloud Background Worker)\u17D6

\u{1F4CB} <b>\u1794\u17D2\u179A\u1792\u17B6\u1793\u1794\u1791\u17D6</b> ${formattedTitle}
\u{1F4C5} <b>\u1790\u17D2\u1784\u17C3\u179F\u17D2\u17A2\u17C2\u1780\u17D6</b> <code>${task.date || "--"}</code>
\u{1F552} <b>\u1796\u17C1\u179B\u179C\u17C1\u179B\u17B6\u17D6</b> <code>${task.time || "--:--"}</code>
\u26A1 <b>\u1780\u1798\u17D2\u179A\u17B7\u178F\u17A2\u17B6\u1791\u17B7\u1797\u17B6\u1796\u17D6</b> ${statusText}

\u179F\u17BC\u1798\u17A2\u179A\u1782\u17BB\u178E!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || "Medium"}</b>`;
    return `<b>\u23F0 1-DAY ADVANCE TASK REMINDER</b>

Hello Mr. Kafa, this is your 1-day advance reminder for tomorrow's scheduled task (24/7 Cloud Background Worker):

\u{1F4CB} <b>Title:</b> ${formattedTitle}
\u{1F4C5} <b>Tomorrow's Date:</b> <code>${task.date || "--"}</code>
\u{1F552} <b>Scheduled Time:</b> <code>${task.time || "--:--"}</code>
\u26A1 <b>Priority:</b> ${statusText}

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
      if (isTaskDueTomorrow(t.date)) {
        const alertKey = `tg_alert_${t.id}_${t.date}`;
        if (sentAlertsMemory.has(alertKey) || t.telegramNotified) {
          continue;
        }
        console.log(`[24/7 Worker] Found task due tomorrow (${t.date}): "${t.task}" (ID: ${t.id}). Dispatching Telegram reminder...`);
        const messageText = buildReminderMessage(t);
        const sent = await sendTelegramRaw(messageText);
        if (sent) {
          sentAlertsMemory.add(alertKey);
          saveSentAlerts(sentAlertsMemory);
          sentCount++;
          sentTitles.push(t.task);
          t.telegramNotified = true;
          taskMap.set(t.id, t);
          if (db) {
            try {
              const taskRef = (0, import_firestore.doc)(db, "tasks", t.id);
              await (0, import_firestore.updateDoc)(taskRef, { telegramNotified: true }).catch(() => {
              });
              const alertLockRef = (0, import_firestore.doc)(db, "telegram_sent_alerts", alertKey);
              await (0, import_firestore.setDoc)(alertLockRef, {
                sent: true,
                sentAt: (/* @__PURE__ */ new Date()).toISOString(),
                taskId: t.id,
                taskTitle: t.task,
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
  }
  if (sentCount > 0) {
    saveServerTasks(Array.from(taskMap.values()));
    console.log(`[24/7 Worker] Successfully sent ${sentCount} Telegram reminder(s): ${sentTitles.join(", ")}`);
  }
  return { checked: allTasks.length, sent: sentCount, alerts: sentTitles };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
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
    res.json({
      active: true,
      service: "24/7 Background Telegram Reminder Worker",
      timezone: "Asia/Phnom_Penh (UTC+7)",
      cambodiaToday,
      cambodiaTomorrow,
      lastCheck: lastWorkerCheckTime,
      monitoredTasksCount: tasks.length,
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
  const DEFAULT_SHEETS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyx__UhJ9vOS0s_WvSlhRLgS6FxKPJEHPnBZMqm4I2dzaeQGayV7FIBTbIvpOlbLu-8yg/exec";
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
      if (clientKey) apiKeysToTry.push(clientKey);
      if (process.env.GEMINI_API_KEY && !apiKeysToTry.includes(process.env.GEMINI_API_KEY)) {
        apiKeysToTry.push(process.env.GEMINI_API_KEY);
      }
      if (apiKeysToTry.length === 0) {
        res.status(401).json({
          error: "Gemini API key is required. Please click the gear icon (\u2699\uFE0F) on the top right to configure your API Key."
        });
        return;
      }
      const modelsToTry = ["gemini-2.0-flash", "gemini-flash", "gemini-pro"];
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
            }
          }
        });
        for (const configAttempt of configAttempts) {
          if (success) break;
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
              console.warn(`Gemini API error for model ${model}:`, err?.message || err);
              lastError = err;
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[24/7 Cloud Worker] Initializing background task reminder service for Cambodia (UTC+7)...`);
    setTimeout(() => {
      checkAndSendReminders().catch((err) => console.error("Initial reminder check error:", err));
    }, 3e3);
    setInterval(() => {
      checkAndSendReminders().catch((err) => console.error("Background reminder interval error:", err));
    }, 30 * 1e3);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
