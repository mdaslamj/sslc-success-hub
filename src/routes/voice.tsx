import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { VoiceTutorPanel } from "@/components/voice/voice-tutor-panel";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Tutor — Aura" },
      {
        name: "description",
        content:
          "Talk to Aura out loud. Multilingual, calm, board-ready voice tutoring for SSLC students.",
      },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  return (
    <DashboardLayout title="Voice Tutor">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-4">
          <h1 className="font-display text-2xl font-semibold">Talk to Aura</h1>
          <p className="text-sm text-muted-foreground">
            Ask a doubt out loud — in English, Kannada, Hindi, Urdu, or a mix.
          </p>
        </header>
        <VoiceTutorPanel context={{ kind: "free_talk" }} />
      </div>
    </DashboardLayout>
  );
}