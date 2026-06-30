export function handle401Redirect(navigate: (to: string, opts?: any) => void) {
  try {
    localStorage.removeItem("token");
  } catch {}
  navigate("/login", { replace: true, state: { reason: "session_expired" } });
}