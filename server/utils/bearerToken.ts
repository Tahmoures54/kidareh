export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || /[\r\n]/.test(authorization)) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
