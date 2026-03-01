"use client";

import { useEffect, useRef } from "react";

export function useScrollToBottom<T extends HTMLElement>(dependency: unknown) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [dependency]);

  return containerRef;
}
