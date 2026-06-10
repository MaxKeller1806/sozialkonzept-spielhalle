/** Schließt das zuletzt geöffnete ActionMenu, damit nur eines gleichzeitig offen ist. */
let activeClose: (() => void) | null = null;

export function registerActionMenuOpen(close: () => void): void {
  if (activeClose && activeClose !== close) {
    activeClose();
  }
  activeClose = close;
}

export function unregisterActionMenuOpen(close: () => void): void {
  if (activeClose === close) {
    activeClose = null;
  }
}
