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
  getChatFontSizeFromStorage,
  setChatFontSizeInStorage,
  getChatLineSpacingFromStorage,
  setChatLineSpacingInStorage,
  type ChatFontSize,
  type ChatLineSpacing,
} from "@/lib/appearance";

interface AppearanceContextValue {
  compact: boolean;
  setCompact: (value: boolean) => void;
  chatFontSize: ChatFontSize;
  setChatFontSize: (value: ChatFontSize) => void;
  chatLineSpacing: ChatLineSpacing;
  setChatLineSpacing: (value: ChatLineSpacing) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [compact, setCompactState] = useState(false);
  const [chatFontSize, setChatFontSizeState] =
    useState<ChatFontSize>("default");
  const [chatLineSpacing, setChatLineSpacingState] =
    useState<ChatLineSpacing>("default");

  useEffect(() => {
    setCompactState(getCompactFromStorage());
    setChatFontSizeState(getChatFontSizeFromStorage());
    setChatLineSpacingState(getChatLineSpacingFromStorage());
  }, []);

  const setCompact = useCallback((value: boolean) => {
    setCompactState(value);
    setCompactInStorage(value);
  }, []);

  const setChatFontSize = useCallback((value: ChatFontSize) => {
    setChatFontSizeState(value);
    setChatFontSizeInStorage(value);
  }, []);

  const setChatLineSpacing = useCallback((value: ChatLineSpacing) => {
    setChatLineSpacingState(value);
    setChatLineSpacingInStorage(value);
  }, []);

  return (
    <AppearanceContext.Provider
      value={{
        compact,
        setCompact,
        chatFontSize,
        setChatFontSize,
        chatLineSpacing,
        setChatLineSpacing,
      }}
    >
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
      chatFontSize: "default" as ChatFontSize,
      setChatFontSize: () => {},
      chatLineSpacing: "default" as ChatLineSpacing,
      setChatLineSpacing: () => {},
    };
  }
  return ctx;
}
