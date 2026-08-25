import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  APP_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 chars long"),
  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET must be at least 16 chars long"),
  KAVENEGAR_API_KEY: z.string().optional(),
  KAVENEGAR_TEMPLATE: z.string().optional(),
  PAYPING_TOKEN: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_ENABLED: z.preprocess((v) => v === undefined ? true : String(v).toLowerCase() === "true", z.boolean()),
  ADMIN_PHONE: z.string().optional(),
  ADMIN_BYPASS_CODE: z.string().optional(),
  SHOW_OTP_IN_DEV: z.preprocess((v) => v === undefined ? false : String(v).toLowerCase() === "true", z.boolean()),
  GEMINI_API_KEY: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production") {
    if (value.JWT_SECRET.length < 32) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["JWT_SECRET"], message: "JWT_SECRET must be at least 32 characters in production" });
    if (value.COOKIE_SECRET.length < 32) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["COOKIE_SECRET"], message: "COOKIE_SECRET must be at least 32 characters in production" });
    if (value.SHOW_OTP_IN_DEV) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["SHOW_OTP_IN_DEV"], message: "SHOW_OTP_IN_DEV must be false in production" });
    if (!value.APP_URL) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["APP_URL"], message: "APP_URL is required in production" });
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\n❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) console.error(`   → ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
