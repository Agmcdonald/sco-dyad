// Utility to normalize and produce a safe file:// URL for cover images.
//
// - If input is already a proper file:// URL, return normalized slashes.
// - If input is a Windows absolute path (C:\...), convert to file:///C:/....
// - If input looks malformed (double 'file:' or embedded file:), attempt to extract the last file: piece.
// - If we can't safely build a URL, return an embedded placeholder data URL.
// - Emits console warnings when suspicious patterns are detected so we can find callsites.
export const PLACEHOLDER_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzMzMyI+CiAgICBObyBDb3ZlcgogIDwvdGV4dD4KICA8cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSIzODAiIGhlaWdodD0iNTgwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K";

function devWarn(msg: string, ...args: any[]) {
  // Keep concise but provide stack for debugging
  try {
    const stack = new Error().stack;
    // eslint-disable-next-line no-console
    console.warn(`[cover-helper] ${msg}`, ...args, stack ? `callstack: ${stack}` : "");
  } catch {
    // ignore
  }
}

function containsSuspiciousPatterns(s: string) {
  // patterns that previously appeared: "/file:/", "Programs/.../file:/", "file:/C:"
  return /\/file:\/|file:[^\/]*\/.*file:|file:\/[A-Za-z]:|Programs[\\\/].*file:\/?/i.test(s);
}

export function getCoverUrl(raw?: string | null): string {
  if (!raw) return PLACEHOLDER_DATA_URL;

  let s = String(raw).trim();

  // If there are multiple 'file:' occurrences, keep the last one (defensive)
  const lastFileIdx = s.lastIndexOf("file:");
  if (lastFileIdx > 0) {
    devWarn("Detected multiple 'file:' occurrences in cover path, using last occurrence.", raw);
    s = s.slice(lastFileIdx);
  }

  // detect suspicious patterns early for diagnostics
  if (containsSuspiciousPatterns(raw)) {
    devWarn("Suspicious cover path pattern detected", raw);
  }

  // Normalize backslashes to forward slashes
  s = s.replace(/\\/g, "/");

  // If already a file URL
  if (s.startsWith("file://")) {
    // Ensure triple-slash (file:///C:/...) format when appropriate
    // Some inputs may be `file:/C:/path` -> normalize to file:///C:/path
    if (/^file:\/(?!\/)/i.test(s) || /^file:\/\/(?!\/)/i.test(s)) {
      const after = s.replace(/^file:\/+/, "");
      s = `file:///${after}`;
    }
    return s;
  }

  // If it starts like 'file:/' but not full 'file://'
  if (s.startsWith("file:/")) {
    const after = s.replace(/^file:\/+/, "");
    return `file:///${after}`;
  }

  // Windows absolute path e.g. C:/ or C:/
  if (/^[A-Za-z]:\//.test(s)) {
    // make sure we have forward slashes and prefix file:///
    const p = s.replace(/^([A-Za-z]:)\//, "$1/"); // ensure shape
    return `file:///${p}`;
  }

  // Windows backward-slash path e.g. C:\...
  if (/^[A-Za-z]:\\/.test(raw)) {
    const p = raw.replace(/\\/g, "/");
    return `file:///${p}`;
  }

  // POSIX absolute path
  if (s.startsWith("/")) {
    return `file://${s}`;
  }

  // If string looks like a relative covers path like 'covers/xxx' or '/covers/xxx', attempt to convert:
  // We don't know app.getPath('userData') here in renderer reliably, so prefer to keep existing raw if it's a URL-like path,
  // otherwise return placeholder and log for later migration.
  // If it looks like 'covers/...' or contains '/covers/', try to extract basename and warn (migration will handle it)
  if (s.includes("/covers/") || s.startsWith("covers/") || /^covers[\/\\]/i.test(s)) {
    devWarn("Relative or legacy covers path encountered in renderer; migration needed", raw);
    // fallback to placeholder for safety
    return PLACEHOLDER_DATA_URL;
  }

  // If the string looks already like a data URL or HTTP(S), return as-is
  if (/^data:|^https?:\/\//i.test(s)) {
    return s;
  }

  // Unknown format — don't try risky concatenations; return placeholder and log
  devWarn("Unrecognized cover path format; returning placeholder", raw);
  return PLACEHOLDER_DATA_URL;
}