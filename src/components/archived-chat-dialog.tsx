"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UrlBadge } from "@/components/url-badge";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: string;
  content: string;
}

interface ArchivedChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | null;
  pages: { url: string; title: string | null }[];
  messages: Message[];
  loading?: boolean;
}

export function ArchivedChatDialog({
  open,
  onOpenChange,
  title,
  pages,
  messages,
  loading = false,
}: ArchivedChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0"
        showCloseButton={true}
      >
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="text-base font-medium truncate pr-8">
            {title || "New Chat"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2 shrink-0">
          <UrlBadge pages={pages} />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No messages in this chat.
            </p>
          ) : (
            <div className="space-y-4 pt-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-4 py-2.5",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
