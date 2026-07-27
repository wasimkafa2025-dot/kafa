export function escapeTelegramHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(text: string, taskId?: string): Promise<boolean> {
  const TG_BOT_TOKEN = "8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g";
  const TG_CHAT_ID = "-1004222754940";

  // Try Express proxy endpoint first if running with backend
  try {
    const proxyRes = await fetch("/api/telegram/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, taskId })
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success) return true;
    }
  } catch (_) {
    // Proxy not available (e.g. static site), fallback to direct API call
  }

  // Direct Telegram Bot API call
  try {
    const telegramUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
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

    if (response.ok) {
      const result = await response.json();
      return !!result.ok;
    }
  } catch (err) {
    console.error("Direct Telegram API error:", err);
  }

  return false;
}

