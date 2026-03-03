"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe } from "lucide-react";

interface UrlBadgeProps {
  pages: {
    url: string;
    title: string | null;
    tokenCount?: number | null;
  }[];
}

/**
 * formatTokenCount function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
function formatTokenCount(n: number): string {
  return n.toLocaleString();
}

/**
 * UrlBadge function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function UrlBadge({ pages }: UrlBadgeProps) {
  if (!pages.length) return null;

  const totalTokens = pages.reduce(
    (sum, p) => sum + (p.tokenCount ?? 0),
    0,
  );

  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-1.5">
      {pages.map((page) => {
        /**
         * hostname function logic.
         * Inputs: function parameters.
         * Outputs: function return value.
         * Side effects: none unless stated in implementation.
         * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
         */
        const hostname = (() => {
          try {
            return new URL(page.url).hostname;
          } catch {
            return page.url;
          }
        })();

        return (
          <Tooltip key={page.url}>
            <TooltipTrigger asChild>
              <a href={page.url} target="_blank" rel="noopener noreferrer">
                <Badge
                  variant="secondary"
                  className="gap-1.5 max-w-[300px] shrink-0 truncate"
                >
                  <Globe className="h-3 w-3 shrink-0" />
                  <span className="truncate">{page.title || hostname}</span>
                  {page.tokenCount != null && (
                    <span className="text-muted-foreground shrink-0">
                      · {formatTokenCount(page.tokenCount)} tokens
                    </span>
                  )}
                </Badge>
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="max-w-xs break-all">{page.url}</span>
              {page.tokenCount != null && (
                <span className="block mt-1 text-muted-foreground text-xs">
                  {formatTokenCount(page.tokenCount)} tokens
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {totalTokens > 0 && pages.length > 1 && (
        <span className="text-muted-foreground text-xs shrink-0">
          {pages.length} pages · {formatTokenCount(totalTokens)} tokens total
        </span>
      )}
    </div>
  );
}
