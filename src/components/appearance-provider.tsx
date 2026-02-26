"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  getCompactFromStorage,
  setCompactInStorage,
} from "@/lib/appearance";

interface AppearanceContextValue {
  compact: boolean;
  setCompact: (value: boolean) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [compact, setCompactState] = useState(false);

  useEffect(() => {
    setCompactState(getCompactFromStorage());
  }, []);

  const setCompact = useCallback((value: boolean) => {
    setCompactState(value);
    setCompactInStorage(value);
  }, []);

  return (
    <AppearanceContext.Provider value={{ compact, setCompact }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    return {
      compact: false,
      setCompact: () => {},
    };
  }
  return ctx;
}
