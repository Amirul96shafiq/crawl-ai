"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface GuestLimitContextValue {
  guestRemaining: number | undefined;
  onOpenRegister: () => void;
}

const GuestLimitContext = createContext<GuestLimitContextValue | null>(null);

interface GuestLimitProviderProps {
  guestRemaining: number | undefined;
  onOpenRegister: () => void;
  children: React.ReactNode;
}

/**
 * GuestLimitProvider function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function GuestLimitProvider({
  guestRemaining,
  onOpenRegister,
  children,
}: GuestLimitProviderProps) {
  const value: GuestLimitContextValue = { guestRemaining, onOpenRegister };
  return (
    <GuestLimitContext.Provider value={value}>
      {children}
    </GuestLimitContext.Provider>
  );
}

/**
 * useGuestLimit function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function useGuestLimit() {
  return useContext(GuestLimitContext);
}
