"use client";

import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface UrlBadgeProps {
  pages: { url: string; title: string | null }[];
}

export function UrlBadge({ pages }: UrlBadgeProps) {
  if (!pages.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {pages.map((page) => {
        const hostname = (() => {
          try {
            return new URL(page.url).hostname;
          } catch {
            return page.url;
          }
        })();

        return (
          <a
            key={page.url}
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Badge
              variant="secondary"
              className="gap-1.5 max-w-[300px] truncate"
            >
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {page.title || hostname}
              </span>
            </Badge>
          </a>
        );
      })}
    </div>
  );
}
