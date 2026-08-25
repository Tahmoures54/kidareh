import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import logger from "../logger.js";
import { env } from "../config/env.js";

// 🟢 اصلاح شد: تبدیل به Boolean صریح برای جلوگیری از خطای تایپ در TypeScript
const isS3Configured = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);

let s3Client: S3Client | null = null;

if (isS3Configured) {
  try {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY!,
        secretAccessKey: env.S3_SECRET_KEY!,
      },
      region: "default", // برای سرویس‌های ایرانی مثل لیارا معمولاً default است
    });
    logger.info("☁️ S3 Object Storage configured.");
  } catch (error) {
    logger.error("❌ Failed to initialize S3 client:", error);
  }
} else {
  const localDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  logger.info("💾 Local file storage configured (Development mode).");
}

/**
 * آپلود فایل در فضای ابری یا لوکال
 * @param file فایل دریافتی از Multer
 * @param folder پوشه مقصد (مثل avatars یا products)
 * @returns آدرس URL فایل آپلود شده
 */
export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = "general"
): Promise<string> => {
  const ext = path.extname(file.originalname);
  const fileName = `${uuidv4()}${ext}`;
  const filePath = `${folder}/${fileName}`;

  if (s3Client && isS3Configured) {
    // ─── حالت ابری (S3) ───
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET!,
          Key: filePath,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read", // تا کاربران بتوانند عکس را در مرورگر ببینند
        })
      );

      // ساخت URL عمومی برای ذخیره در دیتابیس
      const publicUrl = env.S3_PUBLIC_URL 
        ? `${env.S3_PUBLIC_URL}/${filePath}`
        : `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${filePath}`;

      return publicUrl;
    } catch (err) {
      logger.error("❌ S3 Upload failed:", err);
      throw new Error("آپلود فایل در فضای ابری با شکست مواجه شد");
    }
  } else {
    // ─── حالت لوکال (توسعه روی سیستم خودتان) ───
    try {
      const localFolderPath = path.join(process.cwd(), "public/uploads", folder);
      
      // 🟢 اصلاح شد: استفاده از fs.promises برای کد تمیزتر و بدون callback hell
      await fs.promises.mkdir(localFolderPath, { recursive: true });

      const localFilePath = path.join(localFolderPath, fileName);
      
      // نوشتن فایل به صورت غیرهمزمان (Async)
      await fs.promises.writeFile(localFilePath, file.buffer);
      
      // آدرس نسبی برای دیتابیس
      return `/uploads/${folder}/${fileName}`;
    } catch (err) {
      logger.error("❌ Local Upload failed:", err);
      throw new Error("ذخیره فایل در سیستم محلی با شکست مواجه شد");
    }
  }
};