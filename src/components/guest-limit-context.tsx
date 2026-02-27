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

export function useGuestLimit() {
  return useContext(GuestLimitContext);
}
