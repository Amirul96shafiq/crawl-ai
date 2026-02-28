"use client";

import { useState, useEffect } from "react";

export function useTimeUntilMidnightUTC(): string {
  const [timeUntil, setTimeUntil] = useState("");

  useEffect(() => {
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
      if (hours > 0) return `Resets in ${hours}h ${minutes}m`;
      if (minutes > 0) return `Resets in ${minutes}m`;
      return "Resets in <1m";
    }

    setTimeUntil(getTimeUntil());
    const interval = setInterval(() => setTimeUntil(getTimeUntil()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return timeUntil;
}
