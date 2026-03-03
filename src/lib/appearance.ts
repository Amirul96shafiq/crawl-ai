export const COMPACT_STORAGE_KEY = "echologue-compact";
export const CHAT_FONT_SIZE_STORAGE_KEY = "echologue-chat-font-size";
export const CHAT_LINE_SPACING_STORAGE_KEY = "echologue-chat-line-spacing";

export type ChatFontSize = "small" | "default" | "large";
export type ChatLineSpacing = "tight" | "default" | "relaxed";

/**
 * getCompactFromStorage function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function getCompactFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COMPACT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * setCompactInStorage function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function setCompactInStorage(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMPACT_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

/**
 * getChatFontSizeFromStorage function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function getChatFontSizeFromStorage(): ChatFontSize {
  if (typeof window === "undefined") return "default";
  try {
    const v = localStorage.getItem(CHAT_FONT_SIZE_STORAGE_KEY);
    if (v === "small" || v === "default" || v === "large") return v;
    return "default";
  } catch {
    return "default";
  }
}

/**
 * setChatFontSizeInStorage function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function setChatFontSizeInStorage(value: ChatFontSize): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_FONT_SIZE_STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

/**
 * getChatLineSpacingFromStorage function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function getChatLineSpacingFromStorage(): ChatLineSpacing {
  if (typeof window === "undefined") return "default";
  try {
    const v = localStorage.getItem(CHAT_LINE_SPACING_STORAGE_KEY);
    if (v === "tight" || v === "default" || v === "relaxed") return v;
    return "default";
  } catch {
    return "default";
  }
}

/**
 * setChatLineSpacingInStorage function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function setChatLineSpacingInStorage(value: ChatLineSpacing): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_LINE_SPACING_STORAGE_KEY, value);
  } catch {
    // ignore
  }
}
