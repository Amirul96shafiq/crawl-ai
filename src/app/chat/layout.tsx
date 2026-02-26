import { AppShell } from "@/components/app-shell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
