"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldAlert, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getPasswordScore(password: string): 0 | 1 | 2 | 3 {
  if (!password || password.length < 8) return 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  let score = 1;
  if (hasLower && hasUpper) score = 2;
  if (score === 2 && hasSymbol) score = 3;
  return score as 0 | 1 | 2 | 3;
}

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
              ? "Log in to your Echologue account"
              : "Get unlimited chats with Echologue"}
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
                  <PasswordInput
                    id="auth-password"
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
                  <PasswordInput
                    id="auth-password"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <div className="flex gap-1" role="status" aria-live="polite">
                    {[1, 2, 3].map((level) => {
                      const score = getPasswordScore(password);
                      const filled = level <= score;
                      return (
                        <div
                          key={level}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            filled
                              ? score === 1
                                ? "bg-destructive"
                                : score === 2
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              : "bg-muted"
                          )}
                        />
                      );
                    })}
                  </div>
                  {password.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {getPasswordScore(password) === 0 && (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          Add 8+ characters
                        </>
                      )}
                      {getPasswordScore(password) === 1 && (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          Add upper & lowercase
                        </>
                      )}
                      {getPasswordScore(password) === 2 && (
                        <>
                          <Shield className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          Add symbols (e.g. !@#$)
                        </>
                      )}
                      {getPasswordScore(password) === 3 && (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          Strong password
                        </>
                      )}
                    </p>
                  )}
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
