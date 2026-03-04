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
import { SendHorizontal, Clock } from "lucide-react";
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
  maxLength?: number;
}

export const ChatInput = forwardRef<HTMLTextAreaElement | null, ChatInputProps>(
  /**
   * ChatInput function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
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
      maxLength = 1000,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const resolvedRef = ref ?? textareaRef;
    const { compact } = useAppearance();
    const timeUntilReset = useTimeUntilMidnightUTC();

    const isDisabled = disabled || isLoading;

    /**
     * handleKeyDown function logic.
     * Inputs: function parameters.
     * Outputs: function return value.
     * Side effects: none unless stated in implementation.
     * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
     */
    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isDisabled) {
          onSubmit();
        }
      }
    }

    return (
      <div className={cn(compact ? "p-2" : "p-4")}>
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {remainingQuestions !== undefined && questionLimit !== undefined && (
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                <span>
                  {remainingQuestions}/{questionLimit}
                </span>
                <span>questions remaining{resetsDaily ? " today" : ""}</span>
                {resetsDaily && timeUntilReset && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Resets in {timeUntilReset}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="relative">
            <Textarea
              ref={resolvedRef}
              value={input}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={maxLength}
              placeholder={
                disabled
                  ? resetsDaily
                    ? "Daily question limit reached for this chat"
                    : "Question limit reached for this chat"
                  : "Ask anything about the crawled page(s)..."
              }
              className="min-h-[44px] max-h-[150px] resize-none overflow-y-auto pr-20 rounded-[28px] py-4 px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              rows={1}
              disabled={isDisabled}
            />
            <div className="absolute bottom-1 right-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={onSubmit}
                    disabled={!input.trim() || isDisabled}
                    className="h-12 w-16 rounded-full"
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {disabled
                    ? resetsDaily
                      ? "Daily question limit reached"
                      : "Question limit reached"
                    : "Send message"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className={cn("flex justify-center px-4 text-[10px] transition-colors", input.length >= maxLength ? "text-destructive" : "text-muted-foreground/50")}>
            {input.length}/{maxLength}
          </div>
        </div>
      </div>
    );
  },
);
