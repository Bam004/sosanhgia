/**
 * Kiểm tra và xử lý returnUrl an toàn.
 * Chỉ cho phép đường dẫn nội bộ (cùng origin), chặn open redirect.
 */

const BLOCKED_PATHS = ['/dang-nhap', '/dang-ky'];

/**
 * Kiểm tra returnUrl có hợp lệ không.
 * Chỉ cho phép relative path bắt đầu bằng '/'.
 * Chặn external URL, javascript:, data:, //, và login loop.
 */
export function sanitizeReturnUrl(candidate, fallback = '/') {
  if (!candidate || typeof candidate !== 'string') {
    return fallback;
  }

  const trimmed = candidate.trim();

  // Chặn protocol-based URLs (http://, https://, javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  // Chặn protocol-relative URLs (//)
  if (trimmed.startsWith('//')) {
    return fallback;
  }

  // Chặn backslash tricks
  if (trimmed.startsWith('\\')) {
    return fallback;
  }

  // Phải bắt đầu bằng /
  if (!trimmed.startsWith('/')) {
    return fallback;
  }

  // Chặn login loop
  const pathname = trimmed.split('?')[0].split('#')[0];
  if (BLOCKED_PATHS.includes(pathname)) {
    return fallback;
  }

  return trimmed;
}

/**
 * Tạo URL login kèm returnUrl.
 * @param {string} destination - Đường dẫn đích (pathname + search + hash)
 * @returns {string} URL login đầy đủ
 */
export function buildLoginUrl(destination) {
  const safeDestination = sanitizeReturnUrl(destination);
  if (safeDestination === '/') {
    return '/dang-nhap';
  }
  return `/dang-nhap?returnUrl=${encodeURIComponent(safeDestination)}`;
}
