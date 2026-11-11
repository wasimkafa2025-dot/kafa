export const DEFAULT_TG_BOT_TOKEN = "9094304725:AAEhU0iGMwg1atdgSl-gPq1F7jyMrKZu2zY";
export const DEFAULT_TG_CHAT_ID = "-1004222754940";

export function getTelegramConfig(): { botToken: string; chatId: string } {
  if (typeof window !== "undefined") {
    const savedToken = localStorage.getItem("taskflow_tg_token");
    const savedChat = localStorage.getItem("taskflow_tg_chat_id");
    return {
      botToken: (savedToken && savedToken.trim()) ? savedToken.trim() : DEFAULT_TG_BOT_TOKEN,
      chatId: (savedChat && savedChat.trim()) ? savedChat.trim() : DEFAULT_TG_CHAT_ID
    };
  }
  return {
    botToken: DEFAULT_TG_BOT_TOKEN,
    chatId: DEFAULT_TG_CHAT_ID
  };
}

export function setTelegramConfig(botToken: string, chatId: string): void {
  if (typeof window !== "undefined") {
    if (botToken && botToken.trim()) {
      localStorage.setItem("taskflow_tg_token", botToken.trim());
    } else {
      localStorage.removeItem("taskflow_tg_token");
    }

    if (chatId && chatId.trim()) {
      localStorage.setItem("taskflow_tg_chat_id", chatId.trim());
    } else {
      localStorage.removeItem("taskflow_tg_chat_id");
    }
  }
}

export function escapeTelegramHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(
  text: string, 
  taskId?: string,
  customToken?: string,
  customChatId?: string
): Promise<boolean> {
  const cfg = getTelegramConfig();
  const token = customToken || cfg.botToken;
  const chatId = customChatId || cfg.chatId;

  if (!token || !chatId) {
    console.warn("Telegram alert skipped: botToken or chatId is missing");
    return false;
  }

  // 1. Try Express backend proxy endpoint first if running in fullstack Node.js server
  try {
    const proxyRes = await fetch("/api/telegram/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, taskId, botToken: token, chatId })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.success) return true;
    }
  } catch (_) {
    // Proxy not available (e.g. static hosting on GitHub Pages), fallback to direct API call
  }

  // 2. Direct Telegram Bot API call (Fully supported on static sites like GitHub Pages via CORS)
  try {
    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    let response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      // Fallback: If Telegram rejected HTML tags, retry as plain text
      const plainText = text.replace(/<[^>]*>/g, '');
      response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText
        })
      });
    }

    if (response.ok) {
      const result = await response.json();
      return !!result.ok;
    } else {
      const errData = await response.json().catch(() => ({}));
      console.error("Direct Telegram sendMessage error response:", errData);
    }
  } catch (err) {
    console.error("Direct Telegram API error:", err);
  }

  return false;
}

/**
 * Validates Telegram bot credentials and sends an instant test ping.
 * Works seamlessly on static GitHub Pages and fullstack Node.js.
 */
export async function testTelegramConnection(
  customToken?: string,
  customChatId?: string
): Promise<{ success: boolean; message: string; botUsername?: string }> {
  const cfg = getTelegramConfig();
  const token = (customToken && customToken.trim()) ? customToken.trim() : cfg.botToken;
  const chatId = (customChatId && customChatId.trim()) ? customChatId.trim() : cfg.chatId;

  if (!token) {
    return {
      success: false,
      message: "សូមបញ្ចូល Telegram Bot Token (ឧ. 123456789:ABCDefgh... ពី @BotFather)"
    };
  }

  if (!chatId) {
    return {
      success: false,
      message: "សូមបញ្ចូល Telegram Chat ID (ឧ. -1004222754940 ឬ ID ផ្ទាល់ខ្លួន)"
    };
  }

  try {
    // Step 1: Verify Bot Token using getMe
    const getMeRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const getMeData = await getMeRes.json().catch(() => ({}));

    if (!getMeRes.ok || !getMeData.ok) {
      const desc = getMeData.description || 'Unauthorized';
      if (getMeRes.status === 401 || desc.toLowerCase().includes('unauthorized')) {
        return {
          success: false,
          message: `❌ Bot Token មិនត្រឹមត្រូវ (401 Unauthorized)។ សូមពិនិត្យមើល Bot Token ដែលទទួលបានពី @BotFather ឡើងវិញ។`
        };
      }
      return {
        success: false,
        message: `❌ Telegram Bot Error: ${desc}`
      };
    }

    const botUser = getMeData.result;
    const botUsername = botUser.username ? `@${botUser.username}` : (botUser.first_name || 'Bot');

    // Step 2: Send test message to Chat ID
    const nowKhmer = new Intl.DateTimeFormat('km-KH', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());

    const testMsg = `<b>🔔 សាកល្បងភ្ជាប់ Telegram Bot - Daily Task Management</b>\n\n` +
      `✅ ការតភ្ជាប់ប្រព័ន្ធ Telegram ដំណើរការជោគជ័យ ១០០%!\n` +
      `🤖 <b>Bot៖</b> <code>${botUsername}</code>\n` +
      `🕒 <b>ពេលវេលា៖</b> <code>${nowKhmer} (Asia/Phnom_Penh)</code>\n` +
      `⚡ <b>មុខងារ៖</b> ត្រៀមរួចជាស្រេចសម្រាប់ការជូនដំណឹងមុន ១ ថ្ងៃ ឬ ២៤ ម៉ោងមុនពេលមកដល់នៃភារកិច្ច!\n\n` +
      `សូមអរគុណលោក កាហ្វា!`;

    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMsg,
        parse_mode: "HTML"
      })
    });

    const sendData = await sendRes.json().catch(() => ({}));

    if (!sendRes.ok || !sendData.ok) {
      const errDesc = sendData.description || 'Failed to deliver message';
      if (errDesc.toLowerCase().includes('chat not found')) {
        return {
          success: false,
          botUsername,
          message: `❌ Chat ID មិនត្រឹមត្រូវ ឬរកមិនឃើញ (Chat Not Found)។ សូមប្រាកដថាបាន Start Bot (${botUsername}) ឬ Add Bot ទៅកាន់ Group/Channel នេះហើយ។`
        };
      }
      if (errDesc.toLowerCase().includes('blocked by the user')) {
        return {
          success: false,
          botUsername,
          message: `❌ Bot ត្រូវបាន Block ដោយអ្នកប្រើប្រាស់។ សូម Unblock Bot ក្នុង Telegram រួចសាកល្បងម្ដងទៀត។`
        };
      }
      return {
        success: false,
        botUsername,
        message: `❌ មិនអាចផ្ញើសារបាន៖ ${errDesc}`
      };
    }

    return {
      success: true,
      botUsername,
      message: `✅ ភ្ជាប់ជោគជ័យជាមួយ Bot: ${botUsername}! សារសាកល្បងត្រូវបានផ្ញើទៅកាន់ Telegram របស់លោក កាហ្វា រួចរាល់។`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `❌ បរាជ័យក្នុងការតភ្ជាប់ទៅកាន់ Telegram API៖ ${err?.message || 'Network Error'}`
    };
  }
}
