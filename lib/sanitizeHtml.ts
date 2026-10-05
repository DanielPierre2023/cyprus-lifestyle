// lib/sanitizeHtml.ts
// ============================================================================
// Allow-list HTML sanitiser for article bodies (stored HTML is produced by the editor,
// the AI desk, the RSS rewriter and imported text, then rendered with
// dangerouslySetInnerHTML on the public site). Anything outside the allow-list — script,
// style, iframe, on*= handlers, javascript:/data: URLs, forms, SVG, base tags… — is removed.
//
// Runs on the server at render time (the page is ISR-cached for 5 minutes), so it protects
// every article regardless of which pipeline wrote it, and without touching stored data.
// ============================================================================
import sanitizeHtml from 'sanitize-html';

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'small', 'cite', 'mark',
    'blockquote', 'ul', 'ol', 'li',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target', 'hreflang'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  // Root-relative links (/directory/…, /ask) and mailto/tel are fine; no javascript:, data:, vbscript:.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // Drop the CONTENT of dangerous containers instead of leaking their text into the page.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'object', 'embed'],
  transformTags: {
    // Every link we render is safe to open: tabnabbing protection for new-tab links.
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target && out.target !== '_blank') delete out.target;
      if (out.target === '_blank') out.rel = 'noopener noreferrer';
      return { tagName, attribs: out };
    },
    // Lazy-load body images and never leak the referrer-sensitive defaults.
    img: (tagName, attribs) => ({ tagName, attribs: { loading: 'lazy', ...attribs } }),
  },
};

/** Sanitise untrusted article HTML for public rendering. Non-strings become ''. */
export function sanitizeArticleHtml(html: unknown): string {
  if (typeof html !== 'string' || !html) return '';
  return sanitizeHtml(html, OPTIONS);
}
