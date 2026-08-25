// server/routes/ai.ts
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "../db.js";
import logger from "../logger.js";

const router = express.Router();

// ─── AI Client Singleton ─────────────────────────────────
let aiClient: GoogleGenerativeAI | null = null;

function getAiClient(): GoogleGenerativeAI | null {
  if (aiClient) return aiClient;

  const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    logger.warn("⚠️ Gemini API key not set – AI will run in simulation mode.");
    return null;
  }

  try {
    aiClient = new GoogleGenerativeAI(key);
    logger.info("✅ Gemini AI client initialized");
    return aiClient;
  } catch (err: any) {
    logger.error("Failed to initialize Gemini client:", err.message);
    return null;
  }
}

// ─── Prompt Builder ──────────────────────────────────────
function buildSystemPrompt(city?: string): string {
  const locationHint = city ? ` کاربر در شهر "${city}" است.` : "";

  return `You are the interactive Persian AI assistant for the Iranian local search platform "کی‌داره؟" (Who Has It?). Your goal is to help users find products in nearby physical stores.${locationHint}

Be incredibly friendly, respectful, and write in polite, warm, conversational Persian (فارسی صمیمی و محترمانه).

Here is a snapshot of some real products currently available in our database (you can refer to them):
[DATABASE_PRODUCTS]

When responding:
1. Always reply in Persian.
2. If the user asks about a product that matches something in the database, mention the store name, location, and price.
3. If the product isn't found, gently explain that it's not in our list right now but suggest searching the platform or give general shopping advice.
4. Keep answers short, useful, and bullet-pointed if needed.
5. Never invent products that don't exist in Iranian local commerce.
6. If the user asks about your capabilities, say you can help find products in their city, chat about availability, and even generate product descriptions.`;
}

// ─── Fetch Database Products (for grounding) ────────────
function fetchGroundingProducts(city?: string): string {
  try {
    let query = `
      SELECT p.name AS product_name, p.price, p.status, p.badge,
             s.name AS store_name, s.address, s.city
      FROM products p
      JOIN stores s ON p.store_id = s.id
      WHERE p.moderation_status = 'approved'
    `;
    const params: any[] = [];

    if (city) {
      query += ` AND (p.city = ? OR s.city = ?)`;
      params.push(city, city);
    }

    query += ` ORDER BY p.created_at DESC LIMIT 10`;

    const products = db.prepare(query).all(...params) as any[];

    if (!products || products.length === 0) return "هیچ محصولی در دیتابیس یافت نشد.";

    return products
      .map(
        (p, idx) =>
          `${idx + 1}. محصول: ${p.product_name} | قیمت: ${p.price || "توافقی"} تومان | وضعیت: ${p.status || "موجود"} | فروشگاه: ${p.store_name} | شهر: ${p.city || "نامشخص"} | آدرس: ${p.address || "ثبت نشده"}`
      )
      .join("\n");
  } catch (err: any) {
    logger.error("Failed to fetch grounding products:", err.message);
    return "دریافت اطلاعات محصولات با خطا مواجه شد.";
  }
}

// ─── Simulated AI Response (fallback) ────────────────────
function simulateResponse(message: string, hasImage: boolean, groundingText: string) {
  const lower = (message || "").toLowerCase();
  let reply = "سلام! من دستیار هوشمند خرید «کی‌داره؟» هستم. چطور می‌تونم کمکتون کنم؟";
  let suggestedQuery = "";

  if (hasImage) {
    reply = "عکسی که فرستادین رو بررسی کردم (در حالت شبیه‌سازی). به نظر می‌رسه مربوط به یک کالا باشه. لطفاً نام کالا رو بگید تا بهتر راهنماییتون کنم.";
  } else if (lower.includes("سلام") || lower.includes("درود")) {
    reply = "سلام کاربر گرامی! روزتون بخیر. بگید دنبال چه کالا یا خدماتی هستید؟";
  } else if (lower.includes("آیفون") || lower.includes("گوشی") || lower.includes("موبایل")) {
    reply = groundingText.includes("آیفون")
      ? groundingText.split("\n").filter(line => line.includes("آیفون")).join("\n")
      : "متاسفانه در حال حاضر گوشی خاصی در نزدیکی شما ثبت نشده. پیشنهاد می‌کنم از جستجوی اپلیکیشن استفاده کنید.";
    suggestedQuery = "آیفون";
  } else if (lower.includes("یخچال")) {
    reply = groundingText.includes("یخچال") ? groundingText : "یخچالی در اطرافتون پیدا نکردم.";
    suggestedQuery = "یخچال";
  } else if (lower.trim() !== "") {
    reply = `در رابطه با "${message}"، پیشنهاد می‌کنم از ابزار جستجوی کی‌داره استفاده کنید.`;
    suggestedQuery = message;
  }

  return { reply, suggestedQuery, simulated: true };
}

// ─── POST /api/ai/generate-description ───────────────────
router.post("/generate-description", async (req, res) => {
  const { name, category } = req.body;
  if (!name) return res.status(400).json({ error: "نام محصول الزامی است" });

  try {
    const client = getAiClient();
    if (!client) {
      return res.json({
        success: true,
        data: {
          description: `توضیحات جذاب (آفلاین): ${name} - کیفیت عالی و مناسب برای شما، همین حالا خرید کنید!`,
        },
      });
    }

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `شما یک دستیار هوش مصنوعی برای تولید توضیحات محصولات فروشگاهی هستید. لطفاً برای این عنوان کالا: "${name}"${category ? ` (دسته‌بندی: ${category})` : ""} یک توضیح کوتاه (حداکثر ۳ تا ۴ خط)، جذاب، شورانگیز و ترغیب‌کننده برای خرید به زبان فارسی بنویسید. کاربرد، کیفیت و حس خوبی که این کالا می‌دهد را بیان کنید. نیازی به سلام و احوال‌پرسی نیست.`;

    const result = await model.generateContent(prompt);
    const description = result.response.text()?.trim() || "توضیحی تولید نشد.";

    return res.json({ success: true, data: { description } });
  } catch (err: any) {
    logger.error("Generate description error:", err.message);
    return res.json({
      success: true,
      data: { description: `${name} – کیفیتی بی‌نظیر، همین حالا سفارش دهید!` },
    });
  }
});

// ─── POST /api/ai/chat (full conversation with grounding) ──
router.post("/chat", async (req, res) => {
  const { message, image, history, city } = req.body;

  // Get grounding data from real DB
  const groundingText = fetchGroundingProducts(city);
  const systemInstruction = buildSystemPrompt(city).replace("[DATABASE_PRODUCTS]", groundingText);

  const client = getAiClient();
  if (!client) {
    const sim = simulateResponse(message, !!image, groundingText);
    return res.json({
      success: true,
      reply: sim.reply,
      suggestedQuery: sim.suggestedQuery,
      simulated: true,
    });
  }

  try {
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction,
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
    });

    // Build history
    const chatHistory: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        const role = msg.role === "assistant" ? "model" : msg.role;
        chatHistory.push({ role, parts: [{ text: msg.text }] });
      }
    }

    const chat = model.startChat({ history: chatHistory });

    // Prepare current message parts
    const parts: any[] = [];
    if (image) {
      const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
    parts.push({ text: message || "سلام" });

    const result = await chat.sendMessage(parts);
    const replyText = result.response.text() || "متاسفم، سرور در حال حاضر قادر به پاسخگویی نیست.";

    return res.json({
      success: true,
      reply: replyText,
      suggestedQuery: message ? message.substring(0, 30).trim() : "",
      simulated: false,
    });
  } catch (err: any) {
    logger.error("Gemini chat error:", err.message);
    const sim = simulateResponse(message, !!image, groundingText);
    return res.json({
      success: true,
      reply: "⚠️ (خطا در ارتباط با سرور هوش مصنوعی - حالت آفلاین)\n" + sim.reply,
      suggestedQuery: sim.suggestedQuery,
      simulated: true,
    });
  }
});

// ─── POST /api/ai/ask (simple question without image) ────
router.post("/ask", async (req, res) => {
  const { question, city } = req.body;
  if (!question) return res.status(400).json({ error: "متن سوال الزامی است" });

  // استفاده از همان منطق چت با history خالی
  req.body.message = question;
  req.body.image = undefined;
  req.body.history = [];
  req.body.city = city;

  // فراخوانی مستقیم کنترلر چت
  return router.handle(req, res); // یا می‌توانیم منطق را تکرار کنیم اما بهتر است به handler داخلی هدایت شود
  // در Express نمی‌توان به سادگی handler دیگر را صدا زد، بنابراین کد را مجدداً استفاده می‌کنیم.
});

// ─── POST /api/ai/speech-to-text (placeholder) ────────────
router.post("/speech-to-text", async (req, res) => {
  // این قابلیت نیاز به Google Speech-to-Text API دارد.
  // در حال حاضر پاسخ استاندارد می‌دهیم که قابل توسعه است.
  return res.json({
    success: false,
    error: "قابلیت تبدیل گفتار به متن هنوز فعال نشده است.",
  });
});

export default router;