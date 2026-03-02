"use client";

import { useEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>(dependency: unknown) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        el.scrollTop = scrollHeight;
      }
    }
  }, [dependency]);

  return containerRef;
}
