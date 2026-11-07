/** Returns a short diagnostic identifier without serializing error messages or request data. */
export function safeErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return 'INTERNAL_ERROR';
  const code = String((error as { code?: unknown }).code || '');
  return /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code.toUpperCase() : 'INTERNAL_ERROR';
}
