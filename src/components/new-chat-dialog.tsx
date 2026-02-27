"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, Globe, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface DiscoveredLink {
  url: string;
  text: string;
}

interface CrawlResult {
  title: string;
  content: string;
  links: DiscoveredLink[];
}

interface NewChatDialogProps {
  children?: React.ReactNode;
  guestRemaining?: number;
  onChatCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewChatDialog({
  children,
  guestRemaining,
  onChatCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: NewChatDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && controlledOnOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange!(v)
    : setInternalOpen;
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"url" | "links" | "creating">("url");
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [linkSearch, setLinkSearch] = useState("");
  const [urlTouched, setUrlTouched] = useState(false);

  const limitReached = guestRemaining === 0;

  const urlInvalid = useMemo(() => {
    if (!urlTouched || !url.trim()) return false;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return true;
      if (!parsed.hostname.includes(".")) return true;
      if (parsed.hostname.endsWith(".")) return true;
      return false;
    } catch {
      return true;
    }
  }, [url, urlTouched]);

  function reset() {
    setUrl("");
    setStep("url");
    setCrawling(false);
    setCrawlResult(null);
    setSelectedLinks(new Set());
    setLinkSearch("");
    setUrlTouched(false);
  }

  async function handleCrawl() {
    if (!url.trim()) return;

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setCrawling(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to crawl URL");
      }

      const data: CrawlResult = await res.json();
      setCrawlResult(data);
      setStep("links");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to crawl URL");
    } finally {
      setCrawling(false);
    }
  }

  function toggleLink(linkUrl: string) {
    setSelectedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(linkUrl)) {
        next.delete(linkUrl);
      } else if (next.size < 5) {
        next.add(linkUrl);
      } else {
        toast.info("Maximum 5 sub-links allowed per chat");
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!crawlResult) return;
    setStep("creating");

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryPage: {
            url,
            title: crawlResult.title,
            content: crawlResult.content,
          },
          subLinkUrls: Array.from(selectedLinks),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create chat");
      }

      const data = await res.json();
      setOpen(false);
      reset();
      onChatCreated?.();
      toast.success("Chat created successfully");
      router.push(`/chat/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create chat");
      setStep("links");
    }
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>{children}</DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">New chat</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === "url" && "Enter a URL to chat about"}
            {step === "links" && "Select additional pages (optional)"}
            {step === "creating" && "Creating chat..."}
          </DialogTitle>
        </DialogHeader>

        {step === "url" && (
          <div className="space-y-4">
            {limitReached && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Daily chat limit reached. Register for unlimited access.
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/blog/article"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (!urlTouched) setUrlTouched(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !urlInvalid && !limitReached) handleCrawl();
                  }}
                  disabled={crawling || limitReached}
                  aria-invalid={urlInvalid || undefined}
                  className={urlInvalid ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50" : ""}
                />
                <Button onClick={handleCrawl} disabled={crawling || !url.trim() || urlInvalid || limitReached}>
                  {crawling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Crawl"
                  )}
                </Button>
              </div>
              {urlInvalid && (
                <p className="text-xs text-destructive">
                  Please enter a valid URL starting with http:// or https://
                </p>
              )}
            </div>
            {crawling && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4/5 rounded" />
                </div>
                <Skeleton className="h-3 w-24 rounded" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>
            )}
            {!crawling && (
              <p className="text-xs text-muted-foreground">
                We&apos;ll extract the main content from the page so you can ask
                questions about it.
              </p>
            )}
          </div>
        )}

        {step === "links" && crawlResult && (
          <div className="space-y-4 min-w-0 overflow-hidden">
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4" />
                {crawlResult.title || url}
              </div>
              <p className="text-xs text-muted-foreground">
                {crawlResult.content.length.toLocaleString()} characters
                extracted
              </p>
            </div>

            {crawlResult.links.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  Found {crawlResult.links.length} links — select up to 5 to
                  include:
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search links..."
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <ScrollArea className="h-[200px] overflow-x-hidden rounded-md border p-3">
                  <div className="space-y-2">
                    {(() => {
                      const filtered = crawlResult.links.filter(
                        (link) =>
                          !linkSearch.trim() ||
                          link.text.toLowerCase().includes(linkSearch.toLowerCase()) ||
                          link.url.toLowerCase().includes(linkSearch.toLowerCase())
                      );
                      return filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No links match &quot;{linkSearch}&quot;
                        </p>
                      ) : (
                        filtered.map((link) => (
                      <label
                        key={link.url}
                        className="flex min-w-0 items-start gap-2 cursor-pointer hover:bg-accent rounded-md p-1.5 -mx-1.5"
                      >
                        <Checkbox
                          checked={selectedLinks.has(link.url)}
                          onCheckedChange={() => toggleLink(link.url)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm truncate">{link.text}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link.url}
                          </p>
                        </div>
                      </label>
                    ))
                      );
                    })()}
                  </div>
                </ScrollArea>
                {selectedLinks.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedLinks.size}/5 sub-links selected
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setStep("url"); setCrawlResult(null); }}>
                Back
              </Button>
              <Button onClick={handleCreate}>
                {selectedLinks.size > 0
                  ? `Start Chat (${selectedLinks.size + 1} pages)`
                  : "Start Chat"}
              </Button>
            </div>
          </div>
        )}

        {step === "creating" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {selectedLinks.size > 0
                ? "Crawling sub-links and creating chat..."
                : "Creating chat..."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
