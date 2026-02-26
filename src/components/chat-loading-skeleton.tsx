import { Skeleton } from "@/components/ui/skeleton";

export function ChatLoadingSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="pl-14 pr-4 pt-6 pb-3 md:pl-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex justify-start gap-3">
            <Skeleton className="h-16 w-[70%] max-w-md rounded-2xl" />
          </div>
          <div className="flex justify-end gap-3">
            <Skeleton className="h-12 w-[50%] max-w-sm rounded-2xl" />
          </div>
          <div className="flex justify-start gap-3">
            <Skeleton className="h-24 w-[80%] max-w-lg rounded-2xl" />
          </div>
        </div>
      </div>
      <div className="bg-background p-4">
        <div className="mx-auto flex max-w-3xl gap-2 items-end">
          <Skeleton className="h-[44px] flex-1 rounded-md" />
          <Skeleton className="h-[44px] w-[44px] shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}
