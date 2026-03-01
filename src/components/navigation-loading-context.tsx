"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

interface NavigationLoadingContextValue {
  isNavigating: boolean;
  navigateToChat: (id: string) => void;
}

const NavigationLoadingContext =
  createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const navigateToChat = useCallback(
    (id: string) => {
      const target = `/chat/${id}`;
      if (pathname === target) return;
      setIsNavigating(true);
      router.push(target);
    },
    [pathname, router],
  );

  useEffect(() => {
    if (pathname !== prevPathname) {
      setPrevPathname(pathname);
      setIsNavigating(false);
    }
  }, [pathname, prevPathname]);

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, navigateToChat }}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  return ctx;
}
