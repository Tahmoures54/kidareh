export const MAX_RETRY = 3;

export function getSafeError(msg?: string): string {
  if (!msg) return "خطا در برقراری ارتباط با درگاه بانکی. لطفاً دوباره تلاش کنید.";
  return msg.length > 150 ? `${msg.slice(0, 150)}...` : msg;
}