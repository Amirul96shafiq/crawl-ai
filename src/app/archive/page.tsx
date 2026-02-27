import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ArchiveView } from "@/components/archive-view";

export const metadata = {
  title: "Archived Chats - Echologue",
  description: "View and restore your archived chats",
};

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  return <ArchiveView />;
}
