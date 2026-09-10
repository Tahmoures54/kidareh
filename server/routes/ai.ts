// server/routes/ai.ts
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../logger.js";
import { runShoppingAgent } from "../services/ai-shopping.service.js";

const router = express.Router();

let aiClient: GoogleGenerativeAI | null = null;

function getAiClient(): GoogleGenerativeAI | null {
  if (aiClient) return aiClient;
  const key = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    logger.warn("⚠️ Gemini API key not set – AI description generation will use fallback text.");
    return null;
  }
  try {
    aiClient = new GoogleGenerativeAI(key);
    logger.info("✅ Gemini AI client initialized");
    return aiClient;
  } catch (err: any) {
    logger.error("Failed to initialize Gemini client:", err?.message || err);
    return null;
  }
}

// POST /api/ai/generate-description
router.post("/generate-description", async (req, res) => {
  const { name, category } = req.body || {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "نام محصول الزامی است" });
  }

  try {
    const client = getAiClient();
    if (!client) {
      return res.json({
        success: true,
        data: { description: `توضیحات محصول: ${name}${category ? ` | دسته‌بندی: ${category}` : ""}` },
      });
    }

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `برای عنوان کالای زیر یک توضیح کوتاه و دقیق به فارسی بنویس. هیچ مشخصه، قیمت، ضمانت یا ادعایی که از عنوان و دسته‌بندی قابل استنباط نیست اضافه نکن. حداکثر ۳ تا ۴ خط. عنوان: "${name}"${category ? ` دسته‌بندی: "${category}"` : ""}`;
    const result = await model.generateContent(prompt);
    const description = result.response.text()?.trim() || `توضیحات محصول: ${name}`;
    return res.json({ success: true, data: { description } });
  } catch (err: any) {
    logger.error("Generate description error:", err?.message || err);
    return res.json({ success: true, data: { description: `توضیحات محصول: ${name}` } });
  }
});

// POST /api/ai/chat — AI Shopping Agent
router.post("/chat", async (req, res) => {
  const { message, history, city, lat, lng } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "متن پیام الزامی است" });
  }

  try {
    const result = await runShoppingAgent({
      message: message.trim(),
      city: typeof city === "string" ? city.trim() : undefined,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
      history: Array.isArray(history) ? history.slice(-10) : undefined,
    });

    return res.json({
      success: true,
      reply: result.reply,
      suggestedQuery: result.suggestedQuery,
      intent: result.intent,
      products: result.products.slice(0, 8),
      matched: result.matched,
      simulated: result.simulated,
    });
  } catch (err: any) {
    logger.error("Shopping agent error:", err?.message || err);
    return res.status(500).json({
      success: false,
      error: "دستیار خرید موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید.",
    });
  }
});

// POST /api/ai/ask — lightweight shopping agent entry point
router.post("/ask", async (req, res) => {
  const { question, city, lat, lng } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "متن سوال الزامی است" });
  }

  try {
    const result = await runShoppingAgent({
      message: question.trim(),
      city: typeof city === "string" ? city.trim() : undefined,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    });
    return res.json({
      success: true,
      reply: result.reply,
      suggestedQuery: result.suggestedQuery,
      intent: result.intent,
      products: result.products.slice(0, 8),
      matched: result.matched,
      simulated: result.simulated,
    });
  } catch (err: any) {
    logger.error("Shopping ask error:", err?.message || err);
    return res.status(500).json({ success: false, error: "دستیار خرید موقتاً در دسترس نیست." });
  }
});

// Speech-to-text remains an explicit placeholder until a speech provider is configured.
router.post("/speech-to-text", async (_req, res) => {
  return res.json({
    success: false,
    error: "قابلیت تبدیل گفتار به متن هنوز فعال نشده است.",
  });
});

export default router;
