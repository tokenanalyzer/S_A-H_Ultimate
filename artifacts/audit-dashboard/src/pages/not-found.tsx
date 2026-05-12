import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Ghost } from "lucide-react";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Ghost className="h-12 w-12 text-primary/30 mb-4" />
      <h1 className="text-2xl font-bold font-mono text-foreground mb-2">
        <span className="text-primary">404</span> — Page Not Found
      </h1>
      <p className="text-sm text-muted-foreground mb-6 font-mono">
        This path doesn't exist in the audit matrix.
      </p>
      <Button
        variant="outline"
        className="font-mono text-sm"
        onClick={() => navigate("/")}
      >
        Return to Radar
      </Button>
    </div>
  );
}
