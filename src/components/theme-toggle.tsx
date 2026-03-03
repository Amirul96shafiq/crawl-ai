"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";

const themes = ["light", "dark", "system"] as const;
type Theme = (typeof themes)[number];

/**
 * ThemeIcon function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function ThemeIcon({ theme }: { theme: Theme }) {
  switch (theme) {
    case "light":
      return <Sun className="h-5 w-5" />;
    case "dark":
      return <Moon className="h-5 w-5" />;
    case "system":
      return <Monitor className="h-5 w-5" />;
  }
}

/**
 * ThemeToggle function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const buttonClass =
    "fixed top-3 right-3 z-40 bg-background/95 backdrop-blur-sm shadow-md border border-border/50 hover:bg-accent";

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={buttonClass}>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const current = (theme ?? "system") as Theme;
  const nextIndex = (themes.indexOf(current) + 1) % themes.length;
  const nextTheme = themes[nextIndex];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={buttonClass}
          onClick={() => {
            setTheme(nextTheme);
            toast.success(
              `Theme set to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`,
            );
          }}
          aria-label={`Switch to ${nextTheme} theme`}
        >
          <ThemeIcon theme={current} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Switch to {nextTheme} theme</TooltipContent>
    </Tooltip>
  );
}
