import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [{ title: "Aura — School dashboard" }],
  }),
  component: TeacherRedirectPage,
});

/** Legacy route — all school staff use the shared school dashboard. */
function TeacherRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/school/dashboard", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-[40dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
