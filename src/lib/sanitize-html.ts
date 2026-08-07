// Note: deliberately NOT `server-only` — markdown.ts uses this both in
// Server Components (article detail view) and in the client-side edit-form
// preview pane, so it needs to run in both environments.

// Escapes raw HTML special characters so no literal tag/attribute from
// user-authored content can ever be interpreted as markup. This is the base
// escaping step every text run goes through before markdown.ts wraps it in
// its own fixed, hand-built set of safe tags — see markdown.ts. Because we
// never parse or pass through arbitrary HTML from the author, this escape
// step is the sanitizer: there is no "allowed tag list to bypass" for an
// attacker to exploit.
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function decodeBasicEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:"];

// Only http(s)/mailto links (and root-relative in-app links) are allowed.
// javascript:, data:, vbscript:, and anything else that could execute code
// or exfiltrate data is neutralized to "#".
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^\/(?!\/)/.test(trimmed)) return trimmed; // relative in-app link
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (!SAFE_URL_SCHEMES.includes(parsed.protocol)) return "#";
    return trimmed;
  } catch {
    return "#";
  }
}
