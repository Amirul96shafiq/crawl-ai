import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Returns avatar URL with cache-busting query param when image was updated.
 */
export function getAvatarUrl(
  image: string | null | undefined,
  imageUpdatedAt?: Date | string | null,
): string | null {
  if (!image) return null;
  if (imageUpdatedAt) {
    const ts =
      typeof imageUpdatedAt === "string"
        ? new Date(imageUpdatedAt).getTime()
        : imageUpdatedAt.getTime();
    return `${image}?t=${ts}`;
  }
  return image;
}

/**
 * cn function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * getPasswordScore function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function getPasswordScore(password: string): 0 | 1 | 2 | 3 {
  if (!password || password.length < 8) return 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  let score = 1;
  if (hasLower && hasUpper) score = 2;
  if (score === 2 && hasSymbol) score = 3;
  return score as 0 | 1 | 2 | 3;
}

/**
 * generateStrongPassword function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function generateStrongPassword(): string {
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const symbols = "!@#$%&*";
  const all = lower + upper + digits + symbols;
  /**
   * pick function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(lower) + pick(upper) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pwd += pick(all);
  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
