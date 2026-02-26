"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/components/appearance-provider";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SendHorizontal } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ChatInput({
  input,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { compact } = useAppearance();

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit();
      }
    }
  }

  return (
    <div className={cn("bg-background", compact ? "p-2" : "p-4")}>
      <div className="mx-auto flex max-w-3xl gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about the crawled page(s)..."
          className="min-h-[44px] max-h-[200px] resize-none"
          rows={1}
          disabled={isLoading}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={onSubmit}
              disabled={!input.trim() || isLoading}
              className="shrink-0 size-[44px]"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Send message</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
