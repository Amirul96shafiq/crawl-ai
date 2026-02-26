"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "register";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AuthTab;
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = "login",
}: AuthDialogProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setName("");
    setLoading(false);
  }

  function switchTab(newTab: AuthTab) {
    resetForm();
    setTab(newTab);
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetForm();
    onOpenChange(value);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        handleOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Account created but login failed. Please log in manually.");
        setLoading(false);
        return;
      }

      handleOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>
            {tab === "login" ? "Welcome back" : "Create an account"}
          </DialogTitle>
          <DialogDescription>
            {tab === "login"
              ? "Log in to your CrawlChat account"
              : "Get unlimited chats with CrawlChat"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 rounded-lg bg-muted p-1 mx-6 mb-4">
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              tab === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchTab("register")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              tab === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Register
          </button>
        </div>

        <div className="flex flex-col h-[min(320px,55vh)] shrink-0 min-h-0">
          {tab === "login" ? (
            <form onSubmit={handleLogin} className="flex flex-col flex-1 min-h-0 px-6 pb-6">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full shrink-0 mt-4" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Log in
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col flex-1 min-h-0 px-6 pb-6">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="auth-name">Name (optional)</Label>
                  <Input
                    id="auth-name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-email">Email</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-password">Password</Label>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full shrink-0 mt-4" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create account
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
