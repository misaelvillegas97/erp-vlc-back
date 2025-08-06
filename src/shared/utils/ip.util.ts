/**
 * Extracts the real client IP address from request headers, considering proxy forwarded headers
 * @param request - The HTTP request object
 * @returns The client IP address as a string, or undefined if not found
 */
export const extractClientIp = (request: any): string | undefined => {
  // Check for common proxy headers in order of preference
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first one is the original client
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    const clientIp = ips[0];
    if (isValidIp(clientIp)) return clientIp;
  }

  // Check for other common proxy headers
  const realIp = request.headers['x-real-ip'];
  if (realIp && isValidIp(realIp)) return realIp;

  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp && isValidIp(cfConnectingIp)) return cfConnectingIp;

  const clientIp = request.headers['x-client-ip'];
  if (clientIp && isValidIp(clientIp)) return clientIp;

  // Fallback to request.ip (direct connection or when proxy headers are not available)
  if (request.ip && isValidIp(request.ip)) return request.ip;

  // Last resort: check connection remote address
  if (request.connection?.remoteAddress && isValidIp(request.connection.remoteAddress)) return request.connection.remoteAddress;

  return undefined;
};

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 * @param ip - The IP address string to validate
 * @returns True if the IP is valid, false otherwise
 */
const isValidIp = (ip: string): boolean => {
  if (!ip || typeof ip !== 'string') return false;

  // Remove any leading/trailing whitespace
  ip = ip.trim();

  // Check for empty string or localhost/private network indicators that might not be useful
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) return false;

  // Basic IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) return true;

  // Basic IPv6 validation
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  if (ipv6Regex.test(ip)) return true;

  // IPv6 with IPv4 mapping
  const ipv6MappedRegex = /^::ffff:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv6MappedRegex.test(ip);
};
