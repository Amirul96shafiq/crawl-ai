import { countTokens as cl100kCountTokens } from "gpt-tokenizer/encoding/cl100k_base";

/**
 * countTokens function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function countTokens(text: string): number {
  if (!text || typeof text !== "string") return 0;
  return cl100kCountTokens(text);
}
