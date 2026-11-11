/**
 * Autonomous 24/7 Background Task Reminder Worker
 * Designed to execute on GitHub Actions Cron Schedule (every 30 mins)
 * or as a standalone cloud job even when the user's browser is completely closed.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, query, where, setLogLevel } from "firebase/firestore";
import { checkTaskAdvanceAlert, getCambodiaDateStr } from "../src/lib/dateUtils";

// Suppress internal logger noise
try { setLogLevel("silent"); } catch {}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBc4rd74Ibf7nkV3SfTji8EDPChAZTW_LY",
  authDomain: "ai-studio-applet-webapp-313aa.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-313aa",
  storageBucket: "ai-studio-applet-webapp-313aa.firebasestorage.app",
  messagingSenderId: "833142233878",
  appId: "1:833142233878:web:4878a2f05c54cb14ae0e37"
};
const FIRESTORE_DATABASE_ID = "ai-studio-40322e71-9f6e-4f6d-8979-34628b9aa6af";

const DEFAULT_TG_BOT_TOKEN = "8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g";
const DEFAULT_TG_CHAT_ID = "-1004222754940";

const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || DEFAULT_TG_CHAT_ID;

function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

function buildAdvanceReminderMessage(task: any, advAlert: any): string {
  const isKhmer = /[\u1780-\u17FF]/.test(task.task);
  const priorityEmoji = task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢';
  const safeTaskTitle = escapeHtml(task.task || 'Untitled Task');
  const formattedTitle = `<i>${safeTaskTitle}</i>`;

  if (isKhmer) {
    const priorityKh = task.priority === 'High' ? 'បន្ទាន់' : task.priority === 'Medium' ? 'មធ្យម' : 'មិនសូវបន្ទាន់';
    const statusText = `${priorityEmoji} <b>${priorityKh}</b>`;
    const headerTitle = advAlert.isTomorrow
      ? `<b>🔔 សេចក្តីរំលឹកពីការងារដែលត្រូវបំពេញ (១ ថ្ងៃមុន / ថ្ងៃស្អែក)</b>`
      : `<b>🔔 សេចក្តីរំលឹកពីការងារដែលត្រូវបំពេញ (២៤ ម៉ោងមុនពេលមកដល់)</b>`;

    return `${headerTitle}\n\n` +
           `សួស្តីលោក កាហ្វា, នេះជាការរំលឹក ១ ថ្ងៃមុន ឬ ២៤ ម៉ោងមុនពេលមកដល់ (ផ្ញើស្វ័យប្រវត្តិតាម GitHub Cloud Worker)៖\n\n` +
           `📋 <b>ប្រធានបទ៖</b> ${formattedTitle}\n` +
           `📅 <b>កាលបរិច្ឆេទ៖</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>ពេលវេលា៖</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>កម្រិតអាទិភាព៖</b> ${statusText}\n` +
           (advAlert.readableRemainingKhmer ? `⏳ <b>ពេលវេលានៅសល់៖</b> <code>${advAlert.readableRemainingKhmer}</code>\n\n` : `\n`) +
           `សូមអរគុណ!`;
  } else {
    const statusText = `${priorityEmoji} <b>${task.priority || 'Medium'}</b>`;
    return `<b>⏰ 24-HOUR ADVANCE TASK REMINDER</b>\n\n` +
           `Hello Mr. Kafa, this is your advance reminder for scheduled task (GitHub Cloud Worker):\n\n` +
           `📋 <b>Title:</b> ${formattedTitle}\n` +
           `📅 <b>Date:</b> <code>${task.date || '--'}</code>\n` +
           `🕒 <b>Scheduled Time:</b> <code>${task.time || '--:--'}</code>\n` +
           `⚡ <b>Priority:</b> ${statusText}\n` +
           (advAlert.readableRemainingEnglish ? `⏳ <b>Remaining:</b> <code>${advAlert.readableRemainingEnglish}</code>\n\n` : `\n`) +
           `Thank you!`;
  }
}

async function runWorker() {
  console.log(`[GitHub Cloud Worker] Checking pending tasks at ${new Date().toISOString()}...`);
  console.log(`[GitHub Cloud Worker] Cambodia Today: ${getCambodiaDateStr(0)}, Tomorrow: ${getCambodiaDateStr(1)}`);

  const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);

  const q = query(collection(db, "tasks"), where("status", "==", "Pending"));
  const snapshot = await getDocs(q);

  console.log(`[GitHub Cloud Worker] Fetched ${snapshot.size} pending tasks from Firestore.`);

  let checkedCount = 0;
  let sentCount = 0;

  for (const docSnap of snapshot.docs) {
    const t = docSnap.data();
    checkedCount++;

    if (t && t.date && !t.telegramNotified) {
      const advAlert = checkTaskAdvanceAlert(t.date, t.time);

      if (advAlert.shouldAlert) {
        console.log(`[GitHub Cloud Worker] Found due task "${t.task}" (Date: ${t.date}, Time: ${t.time}). Dispatching reminder...`);
        const messageText = buildAdvanceReminderMessage(t, advAlert);
        const sent = await sendTelegramRaw(messageText);

        if (sent) {
          sentCount++;
          console.log(`[GitHub Cloud Worker] Successfully sent Telegram alert for: "${t.task}"`);
          
          const taskRef = doc(db, "tasks", docSnap.id);
          await updateDoc(taskRef, {
            telegramNotified: true,
            telegramNotifiedAt: new Date().toISOString(),
            ...(advAlert.isToday ? { telegramTodayNotified: true } : {})
          }).catch(err => console.warn("Failed updating task doc:", err));

          const alertLockRef = doc(db, "telegram_sent_alerts", `tg_alert_${docSnap.id}_${t.date}`);
          await setDoc(alertLockRef, {
            sent: true,
            sentAt: new Date().toISOString(),
            taskId: docSnap.id,
            taskTitle: t.task,
            alertType: advAlert.alertType,
            source: "github_actions_cron_worker"
          }).catch(err => console.warn("Failed writing alert lock:", err));
        } else {
          console.error(`[GitHub Cloud Worker] Failed sending Telegram message for "${t.task}"`);
        }
      }
    }
  }

  console.log(`[GitHub Cloud Worker] Run completed. Checked: ${checkedCount}, Dispatched: ${sentCount}.`);
}

runWorker()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[GitHub Cloud Worker] Fatal error:", err);
    process.exit(1);
  });
