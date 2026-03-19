import { cn } from "@/lib/utils/cn";

export function LoadingSpinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  return (
    <div className={cn("inline-block animate-spin rounded-full border-2 border-gray-300 border-t-brand-600", sizeClasses[size], className)} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function AiThinking({ message = "AI is thinking..." }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-lg border border-brand-100">
      <LoadingSpinner size="sm" />
      <span className="text-sm text-brand-700 font-medium">{message}</span>
    </div>
  );
}
