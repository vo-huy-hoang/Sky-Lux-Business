/**
 * Fixes character encoding issues for filenames uploaded via multipart/form-data (Multer).
 * Multer often parses UTF-8 filenames as ISO-8859-1 (latin1).
 * Additionally, macOS sends decomposed Unicode (NFD).
 * This utility converts latin1 back to UTF-8 when needed and normalizes to NFC.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return '';
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (Buffer.from(decoded, 'utf8').toString('latin1') === name) {
      return decoded.normalize('NFC');
    }
  } catch {}
  return name.normalize('NFC');
}
