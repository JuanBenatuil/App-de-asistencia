export function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("s") || "";
}
