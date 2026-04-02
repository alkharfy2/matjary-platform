import sanitize from 'sanitize-html'

/**
 * Allowlist for rich-text blocks.
 * Permits common formatting tags while stripping scripts, styles,
 * and event handlers to prevent XSS.
 */
const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: [
    // Headings
    'h1', 'h2', 'h3', 'h4',
    // Block
    'p', 'br', 'hr', 'blockquote', 'pre',
    // Inline
    'strong', 'b', 'em', 'i', 'u', 's', 'code', 'span',
    // Lists
    'ul', 'ol', 'li',
    // Links
    'a',
    // Images (optional rich content)
    'img',
    // Tables (basic)
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    // Allow class for prose styling
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Force safe link behavior
  transformTags: {
    a: sanitize.simpleTransform('a', {
      rel: 'noopener noreferrer',
    }),
  },
  // Strip everything else (script, style, on* handlers, etc.)
  disallowedTagsMode: 'discard',
}

/**
 * Sanitize untrusted HTML content for safe rendering via
 * `dangerouslySetInnerHTML`. Server-safe (no DOM required).
 *
 * Returns empty string for falsy input.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ''
  return sanitize(dirty, SANITIZE_OPTIONS)
}

/**
 * Strip ALL HTML tags and return plain text only.
 * Use for user-supplied plain-text fields (names, comments, etc.)
 */
export function sanitizeText(dirty: string): string {
  if (!dirty) return ''
  return sanitize(dirty, { allowedTags: [], allowedAttributes: {} }).trim()
}
