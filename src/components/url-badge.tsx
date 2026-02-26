"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe } from "lucide-react";

interface UrlBadgeProps {
  pages: { url: string; title: string | null }[];
}

export function UrlBadge({ pages }: UrlBadgeProps) {
  if (!pages.length) return null;

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-1.5">
      {pages.map((page) => {
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
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Badge
                  variant="secondary"
                  className="gap-1.5 max-w-[300px] shrink-0 truncate"
                >
                  <Globe className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {page.title || hostname}
                  </span>
                </Badge>
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="max-w-xs break-all">{page.url}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
