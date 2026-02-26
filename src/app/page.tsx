import { AppShell } from "@/components/app-shell";
import { NewChatDialog } from "@/components/new-chat-dialog";
import { Globe } from "lucide-react";

export default function HomePage() {
  return (
    <AppShell>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome to Echologue
            </h1>
            <p className="text-muted-foreground">
              Enter any webpage URL and ask AI questions about its content.
              We&apos;ll crawl the page, extract the information, and let you
              chat about it.
            </p>
          </div>
          <NewChatDialog />
        </div>
      </div>
    </AppShell>
  );
}
