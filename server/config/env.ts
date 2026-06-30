import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  
  // دیتابیس
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 chars long"),
  
  // درگاه پرداخت و پیامک (اختیاری برای لوکال)
  KAVENEGAR_API_KEY: z.string().optional(),
  PAYPING_TOKEN: z.string().optional(),
  
  // تنظیمات فضای ابری S3 (برای آپلود عکس در سرور)
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n❌ Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;