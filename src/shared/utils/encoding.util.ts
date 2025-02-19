export function fixEncoding(str) {
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str;
  }
}
