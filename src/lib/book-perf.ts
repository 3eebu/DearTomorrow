export function profileBook() {
  return typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' ||
    new URLSearchParams(window.location.search).get('profile') === '1');
}
