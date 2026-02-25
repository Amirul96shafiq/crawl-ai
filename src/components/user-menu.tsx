"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User as UserIcon } from "lucide-react";

interface UserMenuProps {
  user: { name?: string | null; email?: string | null } | null;
  guestRemaining?: number;
}

export function UserMenu({ user, guestRemaining }: UserMenuProps) {
  const router = useRouter();

  if (user) {
    const initials = (user.name || user.email || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">
              {user.name || user.email}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={async () => {
              const { signOut } = await import("next-auth/react");
              await signOut({ redirectTo: "/" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-2">
      {guestRemaining !== undefined && (
        <p className="text-xs text-muted-foreground px-2">
          {guestRemaining}/3 chats remaining today
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => router.push("/login")}
        >
          <UserIcon className="h-3.5 w-3.5 mr-1.5" />
          Login
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => router.push("/register")}
        >
          Register
        </Button>
      </div>
    </div>
  );
}
