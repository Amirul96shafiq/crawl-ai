"use client";

import { useState } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatLoadingSkeleton } from "@/components/chat-loading-skeleton";
import { TopRightActions } from "@/components/top-right-actions";
import { NavigationLoadingProvider, useNavigationLoading } from "@/components/navigation-loading-context";

function MainContent({ children }: { children: React.ReactNode }) {
  const nav = useNavigationLoading();
  const isNavigating = nav?.isNavigating ?? false;

  if (isNavigating) {
    return <ChatLoadingSkeleton />;
  }

  return <>{children}</>;
}

interface ShellWithNavigationProps {
  user: { name?: string | null; email?: string | null } | null;
  guestRemaining?: number;
  children: React.ReactNode;
}

export function ShellWithNavigation({
  user,
  guestRemaining,
  children,
}: ShellWithNavigationProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <NavigationLoadingProvider>
      <div className="flex h-screen">
        <ChatSidebar
          user={user}
          guestRemaining={guestRemaining}
          collapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
        />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <MainContent>{children}</MainContent>
        </main>
      </div>
      <TopRightActions
        sidebarCollapsed={sidebarCollapsed}
        onSidebarCollapseToggle={() => setSidebarCollapsed((c) => !c)}
      />
    </NavigationLoadingProvider>
  );
}
