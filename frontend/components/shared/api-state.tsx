import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ApiState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <Card
        role="status"
        className="flex min-h-44 items-center justify-center gap-3 p-6 text-[var(--muted)]"
      >
        <Loader2 className="animate-spin" size={22} /> Loading backend
        records...
      </Card>
    );
  if (error)
    return (
      <Card role="alert" className="space-y-4 border-[var(--danger)] p-6">
        <p className="font-bold">Backend data unavailable</p>
        <p className="text-sm leading-6 text-[var(--muted)]">{error}</p>
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw size={16} /> Retry
        </Button>
      </Card>
    );
  return null;
}
