import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from "firebase/firestore";

const TG_BOT_TOKEN = "8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g";
const TG_CHAT_ID = "-1004222754940";

// Server storage for 24/7 background worker persistence
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("Could not create data directory:", err);
  }
}
const TASKS_FILE = path.join(DATA_DIR, "server_tasks.json");
const SENT_ALERTS_FILE = path.join(DATA_DIR, "sent_alerts.json");

// Firebase configuration for server-side access
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBc4rd74Ibf7nkV3SfTji8EDPChAZTW_LY",
  authDomain: "ai-studio-applet-webapp-313aa.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-313aa",
  storageBucket: "ai-studio-applet-webapp-313aa.firebasestorage.app",
  messagingSenderId: "833142233878",
  appId: "1:833142233878:web:4878a2f05c54cb14ae0e37"
};
const FIRESTORE_DATABASE_ID = "ai-studio-40322e71-9f6e-4f6d-8979-34628b9aa6af";

function getServerFirestore() {
  try {
    const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG, "server_worker_app") : getApp("server_worker_app");
    return getFirestore(app, FIRESTORE_DATABASE_ID);
  } catch (err) {
    console.warn("Server Firestore init warning:", err);
    return null;
  }
}

function loadServerTasks(): any[] {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Error reading server tasks file:", err);
  }
  return [];
}

function saveServerTasks(tasks: any[]) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
  } catch (err) {
    console.warn("Error saving server tasks file:", err);
  }
}

function loadSentAlerts(): Set<string> {
  try {
    if (fs.existsSync(SENT_ALERTS_FILE)) {
      const data = fs.readFileSync(SENT_ALERTS_FILE, "utf8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) return new Set(list);
    }
  } catch (err) {
    console.warn("Error reading sent alerts file:", err);
  }
  return new Set();
}

function saveSentAlerts(alertsSet: Set<string>) {
  try {
    fs.writeFileSync(SENT_ALERTS_FILE, JSON.stringify(Array.from(alertsSet)), "utf8");
  } catch (err) {
    console.warn("Error saving sent alerts file:", err);
  }
}

function getCambodiaDateStr(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(target);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${year}-${month}-${day}`;
}

function isTaskDueTomorrow(dateStr: string): boolean {
  if (!dateStr) return false;
  const tomorrowStr = getCambodiaDateStr(1);
  if (dateStr === tomorrowStr) return true;

  // Additional check based on calendar day difference
  const todayCambodia = getCambodiaDateStr(0);
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const todayParts = todayCambodia.split('-');
    const d1 = new Date(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10));
    const d2 = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const diffMs = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return diffDays === 1;
  }
  return false;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildReminderMessage(task: any): string {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
  const safeTaskTitle = escapeHtml(task.task || 'Untitled Task');
  const formattedTitle = `<i>${safeTaskTitle}</i>`;

  if (isKhmer) {
    const priorityKh = task.priority === 'High' ? 'បន្ទាន់' : task.priority === 'Medium' ? 'មធ្យម' : 'មិនសូវបន្ទាន់';
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    return `<b>🔔 សេចក្តីរំលឹកពីការងារដែលត្រូវបំពេញ (១ ថ្ងៃមុន)</b>\n\n` +
           `សួស្តីលោក កាហ្វា, នេះជាការរំលឹក ១ ថ្ងៃមុន សម្រាប់កិច្ចការដែលត្រូវបំពេញនៅថ្ងៃស្អែក (ផ្ញើស្វ័យប្រវត្តិតាមប្រព័ន្ធ 24/7 Cloud Background Worker)៖\n\n` +
           `📋 <b>ប្រធានបទ៖</b> ${formattedTitle}\n` +
           `📅 <b>ថ្ងៃស្អែក៖</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>ពេលវេលា៖</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>កម្រិតអាទិភាព៖</b> ${statusText}\n\n` +
           `សូមអរគុណ!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || 'Medium'}</b>`;
    return `<b>⏰ 1-DAY ADVANCE TASK REMINDER</b>\n\n` +
           `Hello Mr. Kafa, this is your 1-day advance reminder for tomorrow's scheduled task (24/7 Cloud Background Worker):\n\n` +
           `📋 <b>Title:</b> ${formattedTitle}\n` +
           `📅 <b>Tomorrow's Date:</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>Scheduled Time:</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>Priority:</b> ${statusText}\n\n` +
           `Thank you!`;
  }
}

async function sendTelegramRaw(text: string): Promise<boolean> {
  const telegramUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
  try {
    let response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text: text,
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      const plainText = text.replace(/<[^>]*>/g, '');
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

const sentAlertsMemory = loadSentAlerts();
let lastWorkerCheckTime = new Date().toISOString();

async function checkAndSendReminders(): Promise<{ checked: number; sent: number; alerts: string[] }> {
  lastWorkerCheckTime = new Date().toISOString();
  let sentCount = 0;
  const sentTitles: string[] = [];

  // Gather tasks from local server file
  const localTasks = loadServerTasks();
  const taskMap = new Map<string, any>();
  for (const t of localTasks) {
    if (t && t.id) taskMap.set(t.id, t);
  }

  // Also query Firestore database if available
  const db = getServerFirestore();
  if (db) {
    try {
      const q = query(collection(db, "tasks"), where("status", "==", "Pending"));
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d && d.id) {
          taskMap.set(d.id, { ...taskMap.get(d.id), ...d });
        }
      });
    } catch (err: any) {
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

          // Mark in local server tasks
          t.telegramNotified = true;
          taskMap.set(t.id, t);

          // Mark in Firestore
          if (db) {
            try {
              const taskRef = doc(db, "tasks", t.id);
              await updateDoc(taskRef, { telegramNotified: true }).catch(() => {});
              const alertLockRef = doc(db, "telegram_sent_alerts", alertKey);
              await setDoc(alertLockRef, {
                sent: true,
                sentAt: new Date().toISOString(),
                taskId: t.id,
                taskTitle: t.task,
                source: "server_24_7_worker"
              }).catch(() => {});
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
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Safe Server-Side Telegram Sender Proxy
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { text, taskId } = req.body;
      if (!text) {
        res.status(400).json({ error: "Missing message text" });
        return;
      }

      // Backend deduplication check
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
    } catch (error: any) {
      console.error("Error sending message to Telegram:", error);
      if (req.body.taskId) {
        sentAlertsMemory.delete(req.body.taskId);
      }
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  // 24/7 Task Synchronizer from Client to Server
  app.post("/api/tasks/sync", (req, res) => {
    try {
      const { tasks } = req.body;
      if (Array.isArray(tasks)) {
        saveServerTasks(tasks);
        // Trigger non-blocking check immediately
        checkAndSendReminders().catch(() => {});
        res.json({ success: true, count: tasks.length });
        return;
      }
      res.status(400).json({ error: "Invalid tasks array" });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Sync failed" });
    }
  });

  // Status of the 24/7 Background Reminder Worker
  app.get("/api/reminders/status", (req, res) => {
    const cambodiaToday = getCambodiaDateStr(0);
    const cambodiaTomorrow = getCambodiaDateStr(1);
    const tasks = loadServerTasks();
    const pendingDueTomorrow = tasks.filter(t => t.status === "Pending" && isTaskDueTomorrow(t.date));

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

  // Manual Trigger for Reminder Check
  app.post("/api/reminders/check-now", async (req, res) => {
    try {
      const result = await checkAndSendReminders();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Manual check failed" });
    }
  });

  // Safe Server-Side Google Sheets Proxy
  const DEFAULT_SHEETS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyx__UhJ9vOS0s_WvSlhRLgS6FxKPJEHPnBZMqm4I2dzaeQGayV7FIBTbIvpOlbLu-8yg/exec";
  app.post("/api/sheets/sync", async (req, res) => {
    try {
      const { url, payload } = req.body;
      let targetUrl = url || process.env.GOOGLE_SHEETS_SCRIPT_URL || DEFAULT_SHEETS_SCRIPT_URL;

      // When deleting, append query parameters to URL for Apps Scripts that read e.parameter
      const isDelete = payload && (payload.action === 'delete' || payload.isDelete || payload.method === 'delete');
      if (isDelete) {
        const sep = targetUrl.includes('?') ? '&' : '?';
        const q = new URLSearchParams({
          action: 'delete',
          id: String(payload.id || payload.taskId || ''),
          task: String(payload.task || payload.title || payload.name || '')
        }).toString();
        targetUrl = `${targetUrl}${sep}${q}`;
      }

      // Update server cache if task payload provided
      if (payload) {
        try {
          const currentTasks = loadServerTasks();
          if (payload.action === 'add' || payload.action === 'update') {
            const idx = currentTasks.findIndex((t: any) => t.id === payload.id);
            if (idx >= 0) {
              currentTasks[idx] = { ...currentTasks[idx], ...payload };
            } else {
              currentTasks.push(payload);
            }
            saveServerTasks(currentTasks);
            checkAndSendReminders().catch(() => {});
          } else if (payload.action === 'delete') {
            const filtered = currentTasks.filter((t: any) => t.id !== payload.id && t.task !== payload.task);
            saveServerTasks(filtered);
          } else if (payload.action === 'batch_sync' && Array.isArray(payload.tasks)) {
            saveServerTasks(payload.tasks);
            checkAndSendReminders().catch(() => {});
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
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error syncing with Google Sheets backend:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to sync with Google Sheets" });
    }
  });

  // Server-Side Gemini Generative AI Proxy
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { prompt, systemInstruction, jsonSchema } = req.body;
      if (!prompt) {
        res.status(400).json({ error: "Missing prompt" });
        return;
      }

      // Check header or environment variable for Gemini key
      const clientKey = req.headers["x-gemini-key"] as string;
      const apiKeysToTry: string[] = [];
      if (clientKey) apiKeysToTry.push(clientKey);
      if (process.env.GEMINI_API_KEY && !apiKeysToTry.includes(process.env.GEMINI_API_KEY)) {
        apiKeysToTry.push(process.env.GEMINI_API_KEY);
      }

      if (apiKeysToTry.length === 0) {
        res.status(401).json({
          error: "Gemini API key is required. Please click the gear icon (⚙️) on the top right to configure your API Key."
        });
        return;
      }

      const modelsToTry = ["gemini-2.0-flash", "gemini-flash", "gemini-pro"];
      let lastError: any = null;
      let responseText = "";
      let success = false;

      // Strategy 1: Full config with schema (if provided)
      // Strategy 2: MimeType application/json without strict schema
      // Strategy 3: Standard text prompt with system instruction
      const configAttempts: any[] = [];
      
      const baseConfig: any = {};
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
        const ai = new GoogleGenAI({
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
                model: model,
                contents: prompt,
                config: configAttempt
              });
              if (response && response.text) {
                responseText = response.text;
                success = true;
                break;
              }
            } catch (err: any) {
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
    } catch (error: any) {
      console.error("Gemini AI API calling error:", error);
      res.status(500).json({ error: error?.message || "Generative request failed" });
    }
  });

  // Vite middleware setup in development, static folder mapping in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`[24/7 Cloud Worker] Initializing background task reminder service for Cambodia (UTC+7)...`);
    
    // Initial check shortly after server startup
    setTimeout(() => {
      checkAndSendReminders().catch(err => console.error("Initial reminder check error:", err));
    }, 3000);

    // Continuous 24/7 background check every 30 seconds
    setInterval(() => {
      checkAndSendReminders().catch(err => console.error("Background reminder interval error:", err));
    }, 30 * 1000);
  });
}

startServer();
