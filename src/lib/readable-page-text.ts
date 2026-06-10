const READABLE_ROOT_SELECTORS = [
  "[data-readable-content]",
  "main#main-content",
  "main",
] as const;

const STRIP_WITHIN_ROOT = [
  "button",
  '[aria-hidden="true"]',
  ".sr-only",
  ".a11y-widget-root",
  "script",
  "style",
  "noscript",
  '[role="menu"]',
  "nav",
  "footer",
] as const;

const STRIP_BODY_CHROME = [
  ".app-layout-sidebar",
  ".app-topbar",
  "aside",
  "header",
  "footer",
  ".a11y-widget-root",
  '[role="dialog"]',
] as const;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripExcludedNodes(root: HTMLElement, extraSelectors: readonly string[] = []) {
  for (const selector of [...STRIP_WITHIN_ROOT, ...extraSelectors]) {
    root.querySelectorAll(selector).forEach((el) => el.remove());
  }
}

/**
 * Extracts visible main content for text-to-speech.
 * Prefers [data-readable-content], then main, then body with chrome excluded.
 */
export function extractReadablePageText(): string {
  if (typeof document === "undefined") return "";

  let source: Element | null = null;
  for (const selector of READABLE_ROOT_SELECTORS) {
    source = document.querySelector(selector);
    if (source) break;
  }

  if (!source) {
    const clone = document.body.cloneNode(true) as HTMLElement;
    stripExcludedNodes(clone, STRIP_BODY_CHROME);
    return normalizeWhitespace(clone.innerText ?? "");
  }

  const clone = source.cloneNode(true) as HTMLElement;
  stripExcludedNodes(clone);
  return normalizeWhitespace(clone.innerText ?? "");
}
