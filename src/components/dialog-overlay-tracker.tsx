"use client";

import { useEffect } from "react";

const DIALOG_OPEN_CLASS = "dialog-open";

/**
 * hasOpenDialogOrSheet function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function hasOpenDialogOrSheet(): boolean {
  return !!(
    document.querySelector("[data-slot='dialog-overlay'][data-state='open']") ||
    document.querySelector("[data-slot='dialog-content'][data-state='open']") ||
    document.querySelector("[data-slot='sheet-content'][data-state='open']")
  );
}

/**
 * updateDialogOpenClass function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function updateDialogOpenClass() {
  document.documentElement.classList.toggle(
    DIALOG_OPEN_CLASS,
    hasOpenDialogOrSheet(),
  );
}

/**
 * DialogOverlayTracker function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function DialogOverlayTracker() {
  useEffect(() => {
    const observer = new MutationObserver(updateDialogOpenClass);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    updateDialogOpenClass();
    return () => observer.disconnect();
  }, []);
  return null;
}
