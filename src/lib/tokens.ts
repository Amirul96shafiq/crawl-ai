import { countTokens as cl100kCountTokens } from "gpt-tokenizer/encoding/cl100k_base";

export function countTokens(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return cl100kCountTokens(text);
}
