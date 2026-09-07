"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <AlertTriangle className="h-10 w-10 text-red-700 mb-3" />
      <h2 className="text-lg font-semibold text-gray-800">
        Something went wrong on this page
      </h2>
      <p className="text-sm text-gray-500 mt-1 max-w-md">
        An unexpected error occurred while rendering this section. You can
        try again, or use the sidebar to navigate elsewhere.
      </p>
      <Button
        className="mt-4 bg-red-700 hover:bg-red-600 text-white"
        onClick={() => reset()}
      >
        Try again
      </Button>
    </div>
  );
}
