"use client";

import { useEffect, useState } from "react";
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
import {
  Loader2,
  Trash2,
  Download,
  RefreshCw,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  cn,
  generateStrongPassword,
  getAvatarUrl,
  getPasswordScore,
} from "@/lib/utils";
import { useAppearance } from "@/components/appearance-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SettingsTab = "profile" | "appearance" | "account";

const themes = ["light", "dark", "system"] as const;
type Theme = (typeof themes)[number];

/**
 * ThemeIcon function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
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
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    imageUpdatedAt?: Date | string | null;
  };
}

/**
 * ProfileSettingsDialog function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function ProfileSettingsDialog({
  open,
  onOpenChange,
  user,
}: ProfileSettingsDialogProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const {
    compact,
    setCompact,
    chatFontSize,
    setChatFontSize,
    chatLineSpacing,
    setChatLineSpacing,
  } = useAppearance();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    getAvatarUrl(user.image, user.imageUpdatedAt) ?? null,
  );

  useEffect(() => {
    if (open) {
      setName(user.name ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setDeleteConfirm("");
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setName(user.name ?? "");
      setAvatarPreview(
        getAvatarUrl(user.image, user.imageUpdatedAt) ?? null,
      );
    }
  }, [open, user.name, user.image, user.imageUpdatedAt]);

  /**
   * handleOpenChange function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
  function handleOpenChange(value: boolean) {
    if (!value) setDeleteConfirm("");
    onOpenChange(value);
  }

  /**
   * handleExport function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
  async function handleExport() {
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `echologue-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
  }

  /**
   * handleDeleteAccount function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirm !== "delete") {
      toast.error('Type "delete" to confirm account deletion');
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
        toast.error(data.error || "Failed to delete account");
        setDeleteLoading(false);
        return;
      }
      onOpenChange(false);
      const { signOut } = await import("next-auth/react");
      await signOut({ redirectTo: "/" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  /**
   * handleSubmit function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error("Current password is required to change password");
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
        toast.error(data.error || "Update failed");
        setLoading(false);
        return;
      }

      toast.success("Profile updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your account preferences</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 rounded-lg bg-muted p-1 mx-6 mb-4">
          <button
            type="button"
            onClick={() => setTab("profile")}
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
            onClick={() => setTab("appearance")}
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
            onClick={() => setTab("account")}
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
            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 min-h-0 px-6 pb-6"
            >
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Avatar</h4>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {avatarPreview && (
                        <AvatarImage src={avatarPreview} alt="Profile" />
                      )}
                      <AvatarFallback className="text-lg">
                        {(user.name || user.email || "U")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor="profile-avatar"
                        className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Camera className="h-4 w-4" />
                        Upload image
                      </Label>
                      <input
                        id="profile-avatar"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        disabled={avatarLoading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setAvatarLoading(true);
                          try {
                            const formData = new FormData();
                            formData.append("avatar", file);
                            const res = await fetch("/api/avatar", {
                              method: "POST",
                              body: formData,
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              toast.error(
                                data.error || "Failed to upload avatar",
                              );
                              return;
                            }
                            setAvatarPreview(
                              data.image
                                ? `${data.image}?t=${Date.now()}`
                                : null,
                            );
                            if (data.image) {
                              toast.success("Avatar updated successfully");
                              await router.refresh();
                            }
                          } catch {
                            toast.error("Failed to upload avatar");
                          } finally {
                            setAvatarLoading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        JPEG, JPG, PNG, WebP. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>
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
                    <Label
                      htmlFor="profile-email"
                      className="text-muted-foreground"
                    >
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
                    <Label htmlFor="profile-current-password">
                      Current password
                    </Label>
                    <PasswordInput
                      id="profile-current-password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="profile-new-password">New password</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setNewPassword(generateStrongPassword())}
                        aria-label="Generate strong password"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Generate
                      </Button>
                    </div>
                    <PasswordInput
                      id="profile-new-password"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={8}
                    />
                    <div
                      className="flex gap-1"
                      role="status"
                      aria-live="polite"
                    >
                      {[1, 2, 3].map((level) => {
                        const score = getPasswordScore(newPassword);
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
                                : "bg-muted",
                            )}
                          />
                        );
                      })}
                    </div>
                    {newPassword.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {getPasswordScore(newPassword) === 0 && (
                          <>
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            Add 8+ characters
                          </>
                        )}
                        {getPasswordScore(newPassword) === 1 && (
                          <>
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            Add upper & lowercase
                          </>
                        )}
                        {getPasswordScore(newPassword) === 2 && (
                          <>
                            <Shield className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            Add symbols (e.g. !@#$)
                          </>
                        )}
                        {getPasswordScore(newPassword) === 3 && (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            Strong password
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-confirm-password">
                      Confirm new password
                    </Label>
                    <PasswordInput
                      id="profile-confirm-password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full shrink-0 mt-4"
                disabled={loading}
              >
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
                        toast.success(
                          `Theme set to ${t.charAt(0).toUpperCase() + t.slice(1)}`,
                        );
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
                      toast.success(
                        enabled
                          ? "Compact mode enabled"
                          : "Compact mode disabled",
                      );
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
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-sm font-medium">Chat</h4>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Font size</Label>
                  <div className="flex gap-2">
                    {(["small", "default", "large"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setChatFontSize(size);
                          toast.success(
                            `Font size set to ${size.charAt(0).toUpperCase() + size.slice(1)}`,
                          );
                        }}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                          chatFontSize === size
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input hover:bg-accent",
                        )}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Line spacing</Label>
                  <div className="flex gap-2">
                    {(["tight", "default", "relaxed"] as const).map(
                      (spacing) => (
                        <button
                          key={spacing}
                          type="button"
                          onClick={() => {
                            setChatLineSpacing(spacing);
                            toast.success(
                              `Line spacing set to ${spacing.charAt(0).toUpperCase() + spacing.slice(1)}`,
                            );
                          }}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                            chatLineSpacing === spacing
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input hover:bg-accent",
                          )}
                        >
                          {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customize font size and line spacing in chat messages
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
