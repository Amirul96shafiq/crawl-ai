"use client";

import { useEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>(dependency: unknown) {
  const containerRef = useRef<T>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom || isFirstRun.current) {
        el.scrollTop = scrollHeight;
      }
      isFirstRun.current = false;
    }
  }, [dependency]);

  return containerRef;
}
