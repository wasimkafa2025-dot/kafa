export function escapeTelegramHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(text: string, taskId?: string): Promise<boolean> {
  const isDevOrPreview = 
    typeof window !== "undefined" && (
      window.location.hostname === "localhost" || 
      window.location.hostname === "127.0.0.1" || 
      window.location.hostname.includes("run.app") || 
      window.location.hostname.includes("webcontainer") || 
      window.location.hostname.includes("aistudio")
    );

  if (isDevOrPreview) {
    // 1. Inside Development / Preview Environments: ONLY use the Server-Side Express Proxy.
    try {
      const response = await fetch("/api/telegram/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text, taskId })
      });

      if (response.ok) {
        const data = await response.json();
        return !!data.success;
      }
      console.error("Express Telegram proxy returned non-OK status:", response.status);
      return false;
    } catch (error) {
      console.error("Express Telegram proxy request failed:", error);
      return false;
    }
  } else {
    // 2. Client-Side Only Production (e.g. GitHub Pages / static hosting): Direct Telegram API call with plain text fallback.
    try {
      const TG_BOT_TOKEN = "8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g";
      const TG_CHAT_ID = "-1004222754940";
      
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
        const errorText = await response.text();
        console.warn("Direct Telegram HTML API failed, retrying with plain text fallback:", errorText);
        
        // Strip HTML tags for clean plain-text delivery fallback
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Direct Telegram API failed on plain text fallback as well:", errorText);
        return false;
      }

      const result = await response.json();
      return !!result.ok;
    } catch (fallbackError) {
      console.error("Failed to send Telegram message directly from browser:", fallbackError);
      return false;
    }
  }
}

