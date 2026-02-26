export const COMPACT_STORAGE_KEY = "crawl-ai-compact";

export function getCompactFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COMPACT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setCompactInStorage(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPACT_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}
