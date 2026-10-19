export function extractBearerToken(authorization: string | undefined): string | null {
  const match = (authorization || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
