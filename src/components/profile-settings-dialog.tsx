"use client";

import { useEffect, useState } from "react";
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
import { Loader2, AlertCircle, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppearance } from "@/components/appearance-provider";
import { Checkbox } from "@/components/ui/checkbox";

type SettingsTab = "profile" | "appearance" | "account";

const themes = ["light", "dark", "system"] as const;
type Theme = (typeof themes)[number];

function ThemeIcon({ theme }: { theme: Theme }) {
  switch (theme) {
    case "light":
      return <Sun className="h-4 w-4" />;
    case "dark":
      return <Moon className="h-4 w-4" />;
    case "system":
      return <Monitor className="h-4 w-4" />;
  }
}

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name?: string | null; email?: string | null };
}

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  user,
}: ProfileSettingsDialogProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { compact, setCompact } = useAppearance();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user.name ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setDeleteConfirm("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setName(user.name ?? "");
    }
  }, [open, user.name]);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setError("");
      setDeleteConfirm("");
    }
    onOpenChange(value);
  }

  async function handleExport() {
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crawlchat-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (deleteConfirm !== "delete") {
      setError('Type "delete" to confirm account deletion');
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete account");
        setDeleteLoading(false);
        return;
      }
      onOpenChange(false);
      const { signOut } = await import("next-auth/react");
      await signOut({ redirectTo: "/" });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword && !currentPassword) {
      setError("Current password is required to change password");
      return;
    }

    setLoading(true);

    try {
      const body: {
        name?: string | null;
        currentPassword?: string;
        newPassword?: string;
      } = { name: name.trim() || null };

      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Update failed");
        setLoading(false);
        return;
      }

      toast.success("Profile updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account preferences
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 rounded-lg bg-muted p-1 mx-6 mb-4">
          <button
            type="button"
            onClick={() => {
              setTab("profile");
              setError("");
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              tab === "profile"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("appearance");
              setError("");
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              tab === "appearance"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Appearance
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("account");
              setError("");
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              tab === "account"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Account
          </button>
        </div>

        <div className="flex flex-col h-[min(400px,55vh)] shrink-0 min-h-0">
        {tab === "profile" && (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 px-6 pb-6">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Username</h4>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-muted-foreground">
                  Email (read-only)
                </Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={user.email ?? ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-medium">Password</h4>
              <div className="space-y-2">
                <Label htmlFor="profile-current-password">Current password</Label>
                <Input
                  id="profile-current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-new-password">New password</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-confirm-password">Confirm new password</Label>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full shrink-0 mt-4" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save changes
          </Button>
        </form>
        )}

        {tab === "appearance" && (
          <div className="space-y-2 overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Theme</h4>
              <div className="flex gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTheme(t);
                      toast.success(`Theme set to ${t.charAt(0).toUpperCase() + t.slice(1)}`);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      (theme ?? "system") === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-accent",
                    )}
                  >
                    <ThemeIcon theme={t} />
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-medium">Layout</h4>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="appearance-compact"
                  checked={compact}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setCompact(enabled);
                    toast.success(enabled ? "Compact mode enabled" : "Compact mode disabled");
                  }}
                />
                <Label
                  htmlFor="appearance-compact"
                  className="text-sm font-normal cursor-pointer"
                >
                  Compact mode
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Reduce spacing in chat for a denser layout
              </p>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="space-y-6 overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Export data</h4>
              <p className="text-xs text-muted-foreground">
                Download all your chats, pages, and messages as a JSON file.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleExport}
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Export my data
              </Button>
            </div>
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-medium text-destructive">
                Delete account
              </h4>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="account-delete-confirm">
                    Type &quot;delete&quot; to confirm
                  </Label>
                  <Input
                    id="account-delete-confirm"
                    placeholder="delete"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="border-destructive/50"
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={deleteConfirm !== "delete" || deleteLoading}
                >
                  {deleteLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <Trash2 className="h-4 w-4" />
                  Delete my account
                </Button>
              </form>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
