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
import { useRef, forwardRef, type KeyboardEvent } from "react";
import { useTimeUntilMidnightUTC } from "@/hooks/use-time-until-midnight-utc";

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
  remainingQuestions?: number;
  questionLimit?: number;
  resetsDaily?: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement | null, ChatInputProps>(
  function ChatInput(
    {
      input,
      onChange,
      onSubmit,
      isLoading,
      disabled = false,
      remainingQuestions,
      questionLimit,
      resetsDaily = false,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const resolvedRef = ref ?? textareaRef;
    const { compact } = useAppearance();
    const timeUntilReset = useTimeUntilMidnightUTC();

    const isDisabled = disabled || isLoading;

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isDisabled) {
          onSubmit();
        }
      }
    }

    return (
      <div className={cn("bg-background", compact ? "p-2" : "p-4")}>
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {remainingQuestions !== undefined && questionLimit !== undefined && (
            <p className="text-xs text-muted-foreground">
              {remainingQuestions}/{questionLimit} questions remaining
              {resetsDaily ? " today" : ""}
              {resetsDaily && timeUntilReset && (
                <span className="ml-1">· {timeUntilReset}</span>
              )}
            </p>
          )}
          <div className="flex gap-4 items-end">
            <Textarea
              ref={resolvedRef}
              value={input}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                disabled
                  ? resetsDaily
                    ? "Daily question limit reached for this chat"
                    : "Question limit reached for this chat"
                  : "Ask anything about the crawled page(s)..."
              }
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
              disabled={isDisabled}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={onSubmit}
                  disabled={!input.trim() || isDisabled}
                  className="shrink-0 size-[44px]"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {disabled
                  ? resetsDaily
                    ? "Daily question limit reached"
                    : "Question limit reached"
                  : "Send message"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  },
);
