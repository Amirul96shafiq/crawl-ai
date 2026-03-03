# Function Comment Standard

Use this format for function-level documentation in Echologue.

## Required fields

- Intent: What the function does and why it exists.
- Inputs: Key parameters and constraints.
- Outputs: Return shape/meaning.
- Side effects: DB writes, network calls, cookies, navigation, events.
- Failure behavior: Validation guards, thrown errors, fallback behavior.

## Style rules

- Keep comments concise and implementation-aware.
- Prefer practical behavior over restating type names.
- Document invariants for logic-heavy code paths.
- Keep one function block comment directly above each function declaration.
- For tiny local callbacks, a short single-line block comment is acceptable.

## Template

```ts
/**
 * <Intent sentence>.
 * Inputs: <relevant inputs>.
 * Outputs: <return behavior>.
 * Side effects: <none | details>.
 * Failure behavior: <none | details>.
 */
```
