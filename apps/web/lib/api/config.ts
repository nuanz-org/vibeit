/**
 * Browser → FastAPI base URL (session cookie forwarded with credentials: "include").
 * Dev default matches apps/api package.json port.
 */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:8000"
  );
}
