import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from "../db.js";

const router = express.Router();

let aiClient: GoogleGenerativeAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ GEMINI_API_KEY is not defined. AI Assistant will run in simulation mode.");
      return null;
    }
    aiClient = new GoogleGenerativeAI(key);
  }
  return aiClient;
}

const GET_STORE_PRODUCTS_PROMPT = `
You are the interactive Persian AI Assistant for the Iranian localized search platform "کی داره؟" (Who Has It?).
Your goal is to help users find local products, shops, or categories.
Be incredibly friendly, respectful, and write in polite, warm, native daily conversational Persian (فارسی صمیمی و محترمانه).

Here is the current list of stores and products in our database that you can refer to:
[DATABASE_PRODUCTS]

When answering the user:
1. Always speak Persian.
2. If they are looking for a product that is in our active database, tell them exactly which store has it, where that store is located, and how much it costs.
3. If they ask for general recommendations or items not found, explain nicely that No exact matching item is in our local list, but they can search the platform, or you can guide them on what categories/shops generally offer this.
4. Keep your answers brief, readable (use bullet points if needed), and highly relevant.
5. Do not hallucinate items that are completely unrelated to Iranian commerce or local shops.
`;

// مسیر تولید توضیحات محصول
router.post("/generate-description", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "No product name provided" });

  try {
    const client = getAiClient();
    if (!client) {
      return res.json({
        success: true,
        data: {
          description: `توضیحات جذاب (آفلاین): ${name} - کیفیت عالی و مناسب برای شما، همین حالا خرید کنید!`
        }
      });
    }

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `شما یک دستیار هوش مصنوعی برای تولید توضیحات محصولات فروشگاهی هستید. لطفاً برای این عنوان کالا: "${name}" یک توضیح کوتاه (در حد ۳ تا ۴ خط)، جذاب، شورانگیز و ترغیب‌کننده برای خرید به زبان فارسی بنویسید. کاربرد، کیفیت و حس خوبی که این کالا می‌دهد را بیان کنید. نیازی به سلام و احوال‌پرسی نیست.`
    );

    const replyText = result.response.text() || "";
    res.json({ success: true, data: { description: replyText.trim() } });

  } catch (err: any) {
    console.error("❌ Gemini API Error (Description Gen):", err.message || err);
    res.json({
      success: true,
      data: {
        description: `توضیحات جذاب: ${name} با کیفیتی بی‌نظیر برای شما فراهم شده است.`
      }
    });
  }
});

// مسیر چت با دستیار هوشمند
router.post("/chat", async (req, res) => {
  const { message, image, history } = req.body;

  try {
    let databaseGroundingText = "هیچ محصولی در دیتابیس یافت نشد.";
    try {
      const dbProducts = db.prepare(`
        SELECT p.name as product_name, p.price, p.status, p.badge, s.name as store_name, s.address, s.category as store_category
        FROM products p
        JOIN stores s ON p.store_id = s.id
        LIMIT 15
      `).all() as any[];

      if (dbProducts && dbProducts.length > 0) {
        databaseGroundingText = dbProducts.map((p, idx) =>
          `${idx + 1}. محصول: ${p.product_name} | قیمت: ${p.price || 'توافقی'} | وضعیت: ${p.status} | برچسب: ${p.badge || 'ندارد'} | فروشگاه: ${p.store_name} | آدرس: ${p.address} | دسته‌بندی: ${p.store_category}`
        ).join("\n");
      }
    } catch (e) {
      console.error("⚠️ Grounding fetch failed, using fallback mock definitions:", e);
      databaseGroundingText = `
1. محصول: گوشی آیفون ۱۳ پرو مکس | قیمت: ۶۵,۰۰۰,۰۰۰ تومان | وضعیت: موجود | فروشگاه: موبایل رضا | آدرس: تهران، ستارخان، بازار سنتی، فاز ۱، پلاک ۱۲
2. محصول: یخچال ساید بای ساید ال‌جی | قیمت: ۸۵,۰۰۰,۰۰۰ تومان | وضعیت: فقط ۱ عدد | فروشگاه: لوازم خانگی امیر | آدرس: تهران، نازی آباد
3. محصول: کتاب هنر شفاف اندیشیدن | قیمت: ۱۵۰,۰۰۰ تومان | وضعیت: موجود | فروشگاه: کتابفروشی فرهنگ | آدرس: تهران، رسالت
4. محصول: ایرپاد پرو ۲ | قیمت: ۱۲,۵۰۰,۰۰۰ | وضعیت: موجود | فروشگاه: موبایل رضا | آدرس: تهران، ستارخان
      `;
    }

    const systemInstruction = GET_STORE_PRODUCTS_PROMPT.replace("[DATABASE_PRODUCTS]", databaseGroundingText);
    const client = getAiClient();

    if (!client) {
      const reply = simulateAIResponse(message, !!image, databaseGroundingText);
      return res.json(reply);
    }

    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      generationConfig: { temperature: 0.7 }
    });

    // ساخت تاریخچه چت
    const chatHistory: any[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        chatHistory.push({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.text }]
        });
      }
    }

    const chat = model.startChat({ history: chatHistory });

    // آماده‌سازی پیام فعلی
    const parts: any[] = [];
    if (image) {
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
      }
    }
    parts.push({ text: message || "سلام، چطور می‌تونی به من کمک کنی؟" });

    const result = await chat.sendMessage(parts);
    const replyText = result.response.text() || "متاسفم، سرور در حال حاضر قادر به پاسخگویی نیست.";

    return res.json({
      success: true,
      reply: replyText,
      suggestedQuery: message ? message.substring(0, 30).trim() : "",
      simulated: false
    });

  } catch (err: any) {
    console.error("❌ Gemini API Error:", err.message || err);
    const reply = simulateAIResponse(message, !!image, "");
    reply.reply = "⚠️ (خطا در ارتباط با سرور هوش مصنوعی - حالت آفلاین) \n\n" + reply.reply;
    return res.json(reply);
  }
});

function simulateAIResponse(message: string, image: boolean, databaseText: string) {
  const lower = message ? message.toLowerCase() : "";
  let reply = "سلام! من دستیار هوشمند خرید «کی داره؟» هستم. چطور می‌تونم کمکتون کنم؟";
  let suggestedQuery = "";

  if (image) {
    reply = "عکسی که فرستادین رو بررسی کردم. به نظر می‌رسه مربوط به یک گوشی موبایل یا گجت هوشمند باشه. آیا مایلید آدرس یا لیست قیمت رو براتون بیارم؟";
    suggestedQuery = "آیفون ۱۳ پرو مکس";
  } else if (lower.includes("سلام") || lower.includes("درود")) {
    reply = "سلام کاربر گرامی! روزتون بخیر. بگید دنبال چه کالا یا خدماتی هستید؟";
  } else if (lower.includes("آیفون") || lower.includes("گوشی") || lower.includes("موبایل")) {
    reply = "در دسته موبایل، «موبایل رضا» در ستارخان گوشی آیفون ۱۳ پرو مکس را با قیمت ۶۵,۰۰۰,۰۰۰ تومان دارد.";
    suggestedQuery = "آیفون ۱۳";
  } else if (lower.includes("یخچال")) {
    reply = "«لوازم خانگی امیر» یخچال ساید بای ساید ال‌جی با قیمت ۸۵,۰۰۰,۰۰۰ تومان دارد.";
    suggestedQuery = "یخچال";
  } else if (lower.includes("کتاب")) {
    reply = "«کتابفروشی فرهنگ» کتاب 'هنر شفاف اندیشیدن' رو با قیمت ۱۵۰,۰۰۰ تومان دارد.";
    suggestedQuery = "هنر شفاف اندیشیدن";
  } else if (lower.includes("آدرس") || lower.includes("کجاست")) {
    reply = "موبایل رضا در ستارخان، بازار سنتی، فاز ۱، پلاک ۱۲ واقع شده است.";
  } else if (lower.trim() !== "") {
    reply = `در رابطه با "${message}"، پیشنهاد می‌کنم از ابزار جستجوی کی‌داره استفاده کنید.`;
    suggestedQuery = message;
  }

  return { success: true, reply, suggestedQuery, simulated: true };
}

export default router;