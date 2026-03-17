/**
 * Sanitize a user-supplied filename so it is safe as a Supabase Storage path
 * segment. Spaces, em-dashes, parentheses and other non-safe characters are
 * replaced with underscores while the file extension is preserved unchanged.
 *
 * e.g.  "my tool (v2) — final.html"  →  "my_tool_v2_final.html"
 */
export function safeStorageFilename(name: string): string {
  const lastDot = name.lastIndexOf(".")
  const base = lastDot > 0 ? name.slice(0, lastDot) : name
  const ext  = lastDot > 0 ? name.slice(lastDot) : ""

  const sanitized = base
    .normalize("NFD")                // decompose unicode accents
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/[^a-zA-Z0-9_-]/g, "_") // replace every other non-safe char
    .replace(/_+/g, "_")             // collapse runs of underscores
    .replace(/^_|_$/g, "")           // trim leading/trailing underscores
    || "file"                        // fallback if everything was stripped

  return sanitized + ext
}
