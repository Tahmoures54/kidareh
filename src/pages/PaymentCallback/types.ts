export type Status = "loading" | "success" | "error";

export interface VerifyRes {
  success?: boolean;
  error?: string;
  message?: string;
}