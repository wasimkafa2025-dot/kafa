// Suppress internal harmless Firestore BloomFilter warnings from being flagged as errors by container monitor
const origConsoleWarn = console.warn;
const origConsoleError = console.error;

const isBloomFilterNoise = (args: any[]) => {
  return args.some(a => {
    if (!a) return false;
    const str = typeof a === "string" ? a : (a?.message || a?.stack || a?.name || String(a));
    return str.includes("BloomFilter") || str.includes("Invalid hash count");
  });
};

console.warn = function (...args: any[]) {
  if (isBloomFilterNoise(args)) return;
  origConsoleWarn.apply(console, args);
};

console.error = function (...args: any[]) {
  if (isBloomFilterNoise(args)) return;
  origConsoleError.apply(console, args);
};

import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, query, where, setLogLevel } from "firebase/firestore";
import { setUserLogHandler } from "@firebase/logger";

try {
  setLogLevel("silent");
} catch {}

try {
  setUserLogHandler((logDetails) => {
    const msg = logDetails.message || "";
    if (msg.includes("BloomFilter") || msg.includes("Invalid hash count")) {
      return;
    }
    if (logDetails.level === "error") {
      origConsoleError(`[${logDetails.type}]:`, logDetails.message);
    }
  });
} catch {}

const TG_BOT_TOKEN = "9094304725:AAEhU0iGMwg1atdgSl-gPq1F7jyMrKZu2zY";
const TG_CHAT_ID = "6536906357";

// Server storage for 24/7 background worker persistence
let DATA_DIR = path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const testFile = path.join(DATA_DIR, ".write_test");
  fs.writeFileSync(testFile, "ok");
  fs.unlinkSync(testFile);
} catch {
  // If working directory is read-only (common in containerized Cloud Run deployments), fall back to /tmp
  DATA_DIR = path.join("/tmp", "applet_data");
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}
const TASKS_FILE = path.join(DATA_DIR, "server_tasks.json");
const SENT_ALERTS_FILE = path.join(DATA_DIR, "sent_alerts.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "system_notifications.json");

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

function loadServerNotifications(): any[] {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, "utf8");
      const list = JSON.parse(data);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.warn("Error reading notifications file:", err);
  }
  return [];
}

function saveServerNotifications(notifs: any[]) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifs, null, 2), "utf8");
  } catch (err) {
    console.warn("Error saving notifications file:", err);
  }
}

function addServerNotification(notif: any) {
  try {
    const list = loadServerNotifications();
    if (!list.some((n: any) => n.id === notif.id)) {
      list.unshift(notif);
      saveServerNotifications(list.slice(0, 100)); // Keep most recent 100
    }
  } catch (err) {
    console.warn("Error adding server notification:", err);
  }
}

function getCambodiaDateFromIso(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    return `${year}-${month}-${day}`;
  } catch {
    return '';
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

function getTaskDueTimestamp(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const time = timeStr && timeStr.includes(':') ? timeStr.trim() : '08:00';
  const paddedTime = time.length === 5 ? time : time.padStart(5, '0');
  const isoStr = `${dateStr}T${paddedTime}:00+07:00`;
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

function checkTaskAdvanceAlert(dateStr: string, timeStr?: string) {
  if (!dateStr) {
    return { shouldAlert: false, alertType: null, hoursRemaining: 0, isTomorrow: false, isToday: false, readableRemainingKhmer: '' };
  }

  const todayCambodia = getCambodiaDateStr(0);
  const tomorrowCambodia = getCambodiaDateStr(1);
  const isToday = (dateStr === todayCambodia);
  const isTomorrow = (dateStr === tomorrowCambodia);

  const taskTimeMs = getTaskDueTimestamp(dateStr, timeStr);
  const nowMs = Date.now();
  const diffMs = taskTimeMs - nowMs;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  let readableRemainingKhmer = '';
  if (hoursRemaining > 24) {
    const days = Math.round(hoursRemaining / 24);
    readableRemainingKhmer = `ប្រហែល ${days} ថ្ងៃទៀត`;
  } else if (hoursRemaining > 0) {
    const hrs = Math.floor(hoursRemaining);
    const mins = Math.round((hoursRemaining - hrs) * 60);
    readableRemainingKhmer = hrs > 0 ? `សល់ ${hrs} ម៉ោង ${mins} នាទីទៀត` : `សល់ ${mins} នាទីទៀត`;
  } else if (hoursRemaining >= -2) {
    readableRemainingKhmer = `ដល់ពេលវេលាកំណត់ហើយ`;
  } else {
    readableRemainingKhmer = `ហួសកាលកំណត់`;
  }

  let shouldAlert = false;
  let alertType: 'one_day_before' | 'twenty_four_hours' | 'due_today' | null = null;

  if (isTomorrow) {
    shouldAlert = true;
    alertType = 'one_day_before';
  } else if (hoursRemaining <= 24 && hoursRemaining >= -2) {
    shouldAlert = true;
    alertType = isToday ? 'due_today' : 'twenty_four_hours';
  } else if (isToday) {
    shouldAlert = true;
    alertType = 'due_today';
  }

  return { shouldAlert, alertType, hoursRemaining, isTomorrow, isToday, readableRemainingKhmer };
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

function isTaskDueToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const todayCambodia = getCambodiaDateStr(0);
  return dateStr === todayCambodia;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildReminderMessage(task: any, remainingText?: string): string {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
  const safeTaskTitle = escapeHtml(task.task || 'Untitled Task');
  const formattedTitle = `<i>${safeTaskTitle}</i>`;

  if (isKhmer) {
    const priorityKh = task.priority === 'High' ? 'បន្ទាន់' : task.priority === 'Medium' ? 'មធ្យម' : 'មិនសូវបន្ទាន់';
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    return `<b>🔔 សេចក្តីរំលឹកពីការងារដែលត្រូវបំពេញ (១ ថ្ងៃមុន / ២៤ ម៉ោងមុន)</b>\n\n` +
           `សួស្តីលោក កាហ្វា, នេះជាការរំលឹក ១ ថ្ងៃមុន ឬ ២៤ ម៉ោងមុនពេលមកដល់ នៃភារកិច្ចដែលត្រូវបំពេញ (24/7 Cloud Background Worker)៖\n\n` +
           `📋 <b>ប្រធានបទ៖</b> ${formattedTitle}\n` +
           `📅 <b>កាលបរិច្ឆេទ៖</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>ពេលវេលា៖</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>កម្រិតអាទិភាព៖</b> ${statusText}\n` +
           (remainingText ? `⏳ <b>ពេលវេលានៅសល់៖</b> <code>${remainingText}</code>\n\n` : `\n`) +
           `សូមអរគុណ!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || 'Medium'}</b>`;
    return `<b>⏰ 24-HOUR / 1-DAY ADVANCE TASK REMINDER</b>\n\n` +
           `Hello Mr. Kafa, this is your 24-hour advance reminder for scheduled task (24/7 Cloud Background Worker):\n\n` +
           `📋 <b>Title:</b> ${formattedTitle}\n` +
           `📅 <b>Date:</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>Scheduled Time:</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>Priority:</b> ${statusText}\n\n` +
           `Thank you!`;
  }
}

function buildTodayReminderMessage(task: any): string {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
  const safeTaskTitle = escapeHtml(task.task || 'Untitled Task');
  const formattedTitle = `<i>${safeTaskTitle}</i>`;

  if (isKhmer) {
    const priorityKh = task.priority === 'High' ? 'បន្ទាន់' : task.priority === 'Medium' ? 'មធ្យម' : 'មិនសូវបន្ទាន់';
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    return `<b>⏰ សេចក្តីរំលឹកពីការងារដែលត្រូវបំពេញ (ថ្ងៃនេះ / Today)</b>\n\n` +
           `សួស្តីលោក កាហ្វា, នេះជាការរំលឹកកិច្ចការដែលត្រូវបំពេញនៅថ្ងៃនេះ (ផ្ញើស្វ័យប្រវត្តិតាមប្រព័ន្ធ 24/7 Cloud Background Worker)៖\n\n` +
           `📋 <b>ប្រធានបទ៖</b> ${formattedTitle}\n` +
           `📅 <b>កាលបរិច្ឆេទ៖</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>ពេលវេលាកំណត់៖</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>កម្រិតអាទិភាព៖</b> ${statusText}\n\n` +
           `សូមអរគុណ!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || 'Medium'}</b>`;
    return `<b>⏰ TASK DUE TODAY REMINDER</b>\n\n` +
           `Hello Mr. Kafa, this is your reminder for today's scheduled task (24/7 Cloud Background Worker):\n\n` +
           `📋 <b>Title:</b> ${formattedTitle}\n` +
           `📅 <b>Date:</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>Scheduled Time:</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>Priority:</b> ${statusText}\n\n` +
           `Thank you!`;
  }
}

function isOneDayPostCompletion(completedAt?: string | null): boolean {
  if (!completedAt) return false;
  try {
    const completedDate = new Date(completedAt);
    if (isNaN(completedDate.getTime())) return false;
    
    const now = Date.now();
    const elapsedMs = now - completedDate.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // If at least 24 hours have passed since completion
    if (elapsedHours >= 24) return true;

    // Check calendar day difference in Cambodia timezone (Asia/Phnom_Penh)
    const completedCambodia = getCambodiaDateFromIso(completedAt);
    const todayCambodia = getCambodiaDateStr(0);

    if (completedCambodia && todayCambodia) {
      const p1 = completedCambodia.split('-');
      const p2 = todayCambodia.split('-');
      if (p1.length === 3 && p2.length === 3) {
        const d1 = new Date(parseInt(p1[0], 10), parseInt(p1[1], 10) - 1, parseInt(p1[2], 10));
        const d2 = new Date(parseInt(p2[0], 10), parseInt(p2[1], 10) - 1, parseInt(p2[2], 10));
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 1) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function buildPostCompletedMessage(task: any): string {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task || '');
  const safeTaskTitle = escapeHtml(task.task || 'Untitled Task');
  const formattedTitle = `<i>${safeTaskTitle}</i>`;

  let compTimeStr = '--';
  if (task.completedAt) {
    try {
      const d = new Date(task.completedAt);
      compTimeStr = new Intl.DateTimeFormat('km-KH', {
        timeZone: 'Asia/Phnom_Penh',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      compTimeStr = task.completedAt;
    }
  }

  const priorityKh = task.priority === 'High' ? '🔴 បន្ទាន់ (High)' : task.priority === 'Medium' ? '🟡 មធ្យម (Medium)' : '🟢 ធម្មតា (Low)';

  if (isKhmer) {
    return `<b>✅ ការជូនដំណឹង៖ កិច្ចការដែលបានបំពេញរួច (រំលងបាន ១ ថ្ងៃ)</b>\n\n` +
           `សួស្តីលោក កាហ្វា, កិច្ចការខាងក្រោមត្រូវបានអ្នកបំពេញរួចរាល់រំលងបាន ១ ថ្ងៃហើយ (ផ្ញើស្វ័យប្រវត្តិតាមប្រព័ន្ធ 24/7 Cloud Background Worker)៖\n\n` +
           `📋 <b>ប្រធានបទ៖</b> ${formattedTitle}\n` +
           `📅 <b>កាលបរិច្ឆេទបំពេញរួច៖</b> <code>${compTimeStr}</code>\n` +
           `⚡ <b>កម្រិតអាទិភាព៖</b> ${priorityKh}\n` +
           `🎉 <b>ស្ថានភាព៖</b> បំពេញរួចរាល់ ១០០% (Completed)\n` +
           `📂 <b>កន្លែងផ្ទុក៖</b> បានរក្សាទុកដោយឡែកក្នុង «កន្លែងផ្ទុកកិច្ចការដែលបានបំពេញហើយ» (Completed Tasks Repository)\n\n` +
           `សូមអរគុណ និងសូមជូនពរឱ្យសម្រេចកិច្ចការបន្ទាប់ៗបានកាន់តែរលូន!`;
  } else {
    return `<b>✅ COMPLETED TASK FOLLOW-UP (1 Day Post-Completion)</b>\n\n` +
           `Hello Mr. Kafa, the following task was completed 1 day ago (24/7 Cloud Background Worker):\n\n` +
           `📋 <b>Title:</b> ${formattedTitle}\n` +
           `📅 <b>Completed At:</b> <code>${compTimeStr}</code>\n` +
           `⚡ <b>Priority:</b> ${task.priority || 'Medium'}\n` +
           `🎉 <b>Status:</b> 100% Completed\n` +
           `📂 <b>Storage Hub:</b> Stored in Completed Tasks Repository\n\n` +
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
      const advAlert = checkTaskAdvanceAlert(t.date, t.time);

      // 1. Advance Reminder: 1 day before OR within 24 hours of arrival
      if (advAlert.shouldAlert && !t.telegramNotified) {
        const alertKey = `tg_alert_${t.id}_${t.date}`;
        
        if (!sentAlertsMemory.has(alertKey)) {
          console.log(`[24/7 Worker] Task due within 24h / tomorrow (${t.date} ${t.time || ''}): "${t.task}" (ID: ${t.id}). Dispatching 24h Telegram reminder...`);
          const messageText = buildReminderMessage(t, advAlert.readableRemainingKhmer);
          const sent = await sendTelegramRaw(messageText);

          if (sent) {
            sentAlertsMemory.add(alertKey);
            saveSentAlerts(sentAlertsMemory);
            sentCount++;
            sentTitles.push(`${t.task} (${advAlert.isTomorrow ? 'Tomorrow' : '24h Advance'})`);

            // Mark in local server tasks
            t.telegramNotified = true;
            if (advAlert.isToday) t.telegramTodayNotified = true;
            taskMap.set(t.id, t);

            // Mark in Firestore
            if (db) {
              try {
                const taskRef = doc(db, "tasks", t.id);
                await updateDoc(taskRef, { 
                  telegramNotified: true,
                  telegramNotifiedAt: new Date().toISOString(),
                  ...(advAlert.isToday ? { telegramTodayNotified: true } : {})
                }).catch(() => {});
                const alertLockRef = doc(db, "telegram_sent_alerts", alertKey);
                await setDoc(alertLockRef, {
                  sent: true,
                  sentAt: new Date().toISOString(),
                  taskId: t.id,
                  taskTitle: t.task,
                  type: advAlert.alertType || "twenty_four_hours",
                  source: "server_24_7_worker"
                }).catch(() => {});
              } catch (err) {
                console.warn("Could not update Firestore notification flag:", err);
              }
            }
          }
        }
      }

      // 2. Same-Day Reminder: Due today
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

            // Mark in local server tasks
            t.telegramTodayNotified = true;
            taskMap.set(t.id, t);

            // Mark in Firestore
            if (db) {
              try {
                const taskRef = doc(db, "tasks", t.id);
                await updateDoc(taskRef, { telegramTodayNotified: true }).catch(() => {});
                const alertLockRef = doc(db, "telegram_sent_alerts", alertKeyToday);
                await setDoc(alertLockRef, {
                  sent: true,
                  sentAt: new Date().toISOString(),
                  taskId: t.id,
                  taskTitle: t.task,
                  type: "due_today",
                  source: "server_24_7_worker"
                }).catch(() => {});
              } catch (err) {
                console.warn("Could not update Firestore today notification flag:", err);
              }
            }
          }
        }
      }
    }

    // 3. Completed Task 1-Day Post-Completion Auto-Notification (រំលងបាន ១ ថ្ងៃ)
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

            // Mark in local server tasks
            t.telegramPostCompletedNotified = true;
            t.systemNotifiedPostCompleted = true;
            taskMap.set(t.id, t);

            // Record system notification on server
            addServerNotification({
              id: `notif_post_comp_${t.id}`,
              taskId: t.id,
              taskTitle: t.task,
              type: "post_completed_1day",
              title: `កិច្ចការបានបំពេញរំលង ១ ថ្ងៃ៖ ${t.task}`,
              message: `កិច្ចការ «${t.task}» ត្រូវបានអ្នកបំពេញរួចរាល់រំលងបាន ១ ថ្ងៃហើយ។ ប្រព័ន្ធបានរក្សាទុកក្នុងកន្លែងផ្ទុកកិច្ចការដែលបានបំពេញរួច និងបានផ្ញើសារអូតូទៅកាន់ Telegram រួចរាល់។`,
              createdAt: new Date().toISOString(),
              read: false
            });

            // Mark in Firestore
            if (db) {
              try {
                const taskRef = doc(db, "tasks", t.id);
                await updateDoc(taskRef, {
                  telegramPostCompletedNotified: true,
                  systemNotifiedPostCompleted: true
                }).catch(() => {});

                const alertLockRef = doc(db, "telegram_sent_alerts", postAlertKey);
                await setDoc(alertLockRef, {
                  sent: true,
                  sentAt: new Date().toISOString(),
                  taskId: t.id,
                  taskTitle: t.task,
                  type: "post_completed_1day",
                  source: "server_24_7_worker"
                }).catch(() => {});
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
  const app = express();

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

  // Test endpoint to verify 24/7 Telegram notification connectivity directly from server
  app.post("/api/telegram/test-server", async (req, res) => {
    try {
      const cambodiaToday = getCambodiaDateStr(0);
      const testMsg = `<b>🔔 24/7 Cloud Background Worker Test</b>\n\n` +
        `✅ Telegram notifications are actively functioning from the server.\n` +
        `📅 Cambodia Date: <code>${cambodiaToday}</code>\n` +
        `🌐 Timezone: Asia/Phnom_Penh (UTC+7)\n` +
        `🚀 Status: Running 24/7 even when browser or device is closed.`;
      const sent = await sendTelegramRaw(testMsg);
      res.json({ success: sent });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to send test alert" });
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
    const completedTasks = tasks.filter(t => t.status === "Completed");
    const completed1DayNotified = completedTasks.filter(t => t.telegramPostCompletedNotified);

    res.json({
      active: true,
      service: "24/7 Background Telegram Reminder Worker",
      timezone: "Asia/Phnom_Penh (UTC+7)",
      cambodiaToday,
      cambodiaTomorrow,
      lastCheck: lastWorkerCheckTime,
      monitoredTasksCount: tasks.length,
      pendingCount: tasks.filter(t => t.status === "Pending").length,
      completedCount: completedTasks.length,
      completed1DayNotifiedCount: completed1DayNotified.length,
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

  // --- SYSTEM NOTIFICATIONS API ("និង លើប្រព័ន្ធ") ---
  app.get("/api/notifications", (req, res) => {
    try {
      const list = loadServerNotifications();
      res.json({ success: true, notifications: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to load notifications" });
    }
  });

  app.post("/api/notifications/mark-read", (req, res) => {
    try {
      const { id, all } = req.body;
      let list = loadServerNotifications();
      if (all) {
        list = list.map((n: any) => ({ ...n, read: true }));
      } else if (id) {
        list = list.map((n: any) => n.id === id ? { ...n, read: true } : n);
      }
      saveServerNotifications(list);
      res.json({ success: true, count: list.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to mark notifications read" });
    }
  });

  app.post("/api/notifications/clear", (req, res) => {
    try {
      saveServerNotifications([]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to clear notifications" });
    }
  });

  // Force-send 1-Day Completed Task Auto-Notification (both Telegram and System) for testing/immediate trigger
  app.post("/api/telegram/send-post-completed", async (req, res) => {
    try {
      const { taskId, task } = req.body;
      let targetTask = task;
      if (!targetTask && taskId) {
        const tasks = loadServerTasks();
        targetTask = tasks.find((t: any) => t.id === taskId);
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

        // Update task status flag in server cache
        const tasks = loadServerTasks();
        const idx = tasks.findIndex((t: any) => t.id === targetTask.id);
        if (idx >= 0) {
          tasks[idx].telegramPostCompletedNotified = true;
          tasks[idx].systemNotifiedPostCompleted = true;
          saveServerTasks(tasks);
        }

        // Add to server system notifications
        addServerNotification({
          id: `notif_post_comp_${targetTask.id}_${Date.now()}`,
          taskId: targetTask.id,
          taskTitle: targetTask.task,
          type: "post_completed_1day",
          title: `កិច្ចការបានបំពេញរំលង ១ ថ្ងៃ៖ ${targetTask.task}`,
          message: `កិច្ចការ «${targetTask.task}» ត្រូវបានអ្នកបំពេញរួចរាល់រំលងបាន ១ ថ្ងៃហើយ។ ប្រព័ន្ធបានរក្សាទុកក្នុងកន្លែងផ្ទុកកិច្ចការដែលបានបំពេញរួច និងបានផ្ញើសារអូតូទៅកាន់ Telegram រួចរាល់។`,
          createdAt: new Date().toISOString(),
          read: false
        });

        // Sync to Firestore if available
        const db = getServerFirestore();
        if (db) {
          try {
            const taskRef = doc(db, "tasks", targetTask.id);
            await updateDoc(taskRef, {
              telegramPostCompletedNotified: true,
              systemNotifiedPostCompleted: true
            }).catch(() => {});
          } catch {}
        }

        res.json({ success: true, message: "1-Day Completed notification dispatched to Telegram and System" });
        return;
      }

      res.status(502).json({ success: false, error: "Telegram dispatch failed" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || "Failed to trigger post-completed notification" });
    }
  });

  // Safe Server-Side Google Sheets Proxy
  const DEFAULT_SHEETS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx16udHQpOdqaMfcb8JGHjw5EXLypzhZu9IPEmkfDZjgg3_Kzt3o2Nom08wZ8vag2hETA/exec";
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

      // Valid, modern Flash model per Google GenAI guidelines
      const modelsToTry = [
        "gemini-3.6-flash"
      ];
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
            },
            timeout: 12000
          }
        });

        let keyDenied = false;
        for (const configAttempt of configAttempts) {
          if (success || keyDenied) break;
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
              const errMsg = err?.message || String(err);
              console.warn(`Gemini API error for model ${model}:`, errMsg);
              lastError = err;
              // If this key is denied access (403) or invalid (401), stop testing other configs/models for this key
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
    } catch (error: any) {
      console.error("Gemini AI API calling error:", error);
      res.status(500).json({ error: error?.message || "Generative request failed" });
    }
  });

  // Determine environment: true production when bundled or NODE_ENV=production
  const isProduction =
    process.env.NODE_ENV === "production" ||
    typeof __dirname !== "undefined" && __dirname.includes("dist") ||
    !process.argv.some(arg => arg.includes("server.ts"));

  if (isProduction) {
    const distPath = (typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html")))
      ? __dirname
      : path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send("Daily Task Management API Server is running.");
      }
    });
  } else {
    // Dynamic import of Vite in development only
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const primaryPort = isProduction
    ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000)
    : 3000;
  const secondaryPort = primaryPort === 3000 && process.env.PORT && parseInt(process.env.PORT, 10) !== 3000
    ? parseInt(process.env.PORT, 10)
    : (primaryPort !== 3000 ? 3000 : null);

  let workerStarted = false;
  const startBackgroundWorker = () => {
    if (workerStarted) return;
    workerStarted = true;
    console.log(`[24/7 Cloud Worker] Initializing background task reminder service for Cambodia (UTC+7)...`);
    
    // Initial check shortly after server startup
    setTimeout(() => {
      checkAndSendReminders().catch(err => console.error("Initial reminder check error:", err));
    }, 3000);

    // Continuous 24/7 background check every 30 seconds
    setInterval(() => {
      checkAndSendReminders().catch(err => console.error("Background reminder interval error:", err));
    }, 30 * 1000);
  };

  // Primary listener
  try {
    const primaryServer = app.listen(primaryPort, "0.0.0.0", () => {
      console.log(`[Server] Primary listener running on http://0.0.0.0:${primaryPort} (${isProduction ? "production" : "development"})`);
      startBackgroundWorker();
    });
    primaryServer.on("error", (err: any) => {
      console.warn(`[Server] Primary listener note on port ${primaryPort}: ${err.message}`);
    });
  } catch (err: any) {
    console.warn(`[Server] Could not initialize primary listener on port ${primaryPort}: ${err.message}`);
  }

  // Secondary/Auxiliary listener (ensures both 3000 and Cloud Run's assigned PORT are available)
  if (secondaryPort && secondaryPort !== primaryPort) {
    try {
      const secondaryServer = app.listen(secondaryPort, "0.0.0.0", () => {
        console.log(`[Server] Auxiliary listener running on http://0.0.0.0:${secondaryPort}`);
        startBackgroundWorker();
      });
      secondaryServer.on("error", (err: any) => {
        // Expected when a port like 8080 is reserved by container reverse proxy in dev mode
        console.log(`[Server] Auxiliary port ${secondaryPort} binding note: ${err.message}`);
      });
    } catch (err: any) {
      console.log(`[Server] Auxiliary port ${secondaryPort} note: ${err?.message || err}`);
    }
  }
}

startServer();
