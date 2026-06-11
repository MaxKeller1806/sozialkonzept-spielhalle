export const PASSWORD_RESET_REQUESTS_CHANGED =
  "password-reset-requests-changed";

export function notifyPasswordResetRequestsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PASSWORD_RESET_REQUESTS_CHANGED));
}
