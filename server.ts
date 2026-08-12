import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const TG_BOT_TOKEN = "8735305943:AAGlV3cMV5pMuF6ef6EQzLMrirf4A-oQ79g";
const TG_CHAT_ID = "-1004222754940";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // In-memory set to prevent duplicate Telegram alerts for the same task ID
  const sentTaskIds = new Set<string>();

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
        if (sentTaskIds.has(taskId)) {
          console.log(`[Deduplication] Blocked duplicate Telegram alert for task ID: ${taskId}`);
          res.json({ success: true, duplicated: true });
          return;
        }
        sentTaskIds.add(taskId);
        
        // Remove from memory after 1 hour to prevent memory leaks
        setTimeout(() => {
          sentTaskIds.delete(taskId);
        }, 60 * 60 * 1000);
      }

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
        console.warn("Express Telegram HTML attempt failed, retrying plain text fallback:", errorText);
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
        console.error("Telegram API response failed on plain text fallback as well:", errorText);
        // If sending failed, clean up taskId from tracking so it can be retried
        if (taskId) {
          sentTaskIds.delete(taskId);
        }
        res.status(502).json({ error: "Telegram API failed", details: errorText });
        return;
      }

      const result = await response.json();
      res.json({ success: true, result });
    } catch (error: any) {
      console.error("Error sending message to Telegram:", error);
      if (req.body.taskId) {
        sentTaskIds.delete(req.body.taskId);
      }
      res.status(500).json({ error: error.message || "Failed to send message" });
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
  });
}

startServer();
