import { Skeleton } from "@/components/ui/skeleton";

/**
 * RootLoading function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export default function RootLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="space-y-6 max-w-md px-4 w-full">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
          <Skeleton className="h-16 w-16 rounded-2xl" />
        </div>
        <div className="space-y-2 text-center">
          <Skeleton className="h-8 w-48 mx-auto rounded" />
          <Skeleton className="h-4 w-full max-w-sm mx-auto rounded" />
          <Skeleton className="h-4 w-full max-w-xs mx-auto rounded" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
