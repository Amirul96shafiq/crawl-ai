"use client";

import { useState, useEffect } from "react";

/**
 * Returns a compact duration string until the next UTC midnight reset.
 */
export function useTimeUntilMidnightUTC(): string {
  const [timeUntil, setTimeUntil] = useState("");

  useEffect(() => {
    /**
     * getTimeUntil function logic.
     * Inputs: function parameters.
     * Outputs: function return value.
     * Side effects: none unless stated in implementation.
     * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
     */
    function getTimeUntil() {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setUTCHours(0, 0, 0, 0);
      if (nextMidnight <= now) {
        nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
      }
      const ms = nextMidnight.getTime() - now.getTime();
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m`;
      return "<1m";
    }

    setTimeUntil(getTimeUntil());
    const interval = setInterval(() => setTimeUntil(getTimeUntil()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return timeUntil;
}
