import { Mic, MicOff, Square, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceTutor, type UseVoiceTutorApi } from "@/hooks/use-voice-tutor";
import { VoiceOrb, VoiceWaveform } from "./voice-orb";
import {
  VOICE_LANGUAGE_LABEL,
  VOICE_MODE_LABEL,
  type VoiceLanguage,
  type VoiceTutorMode,
  type VoiceSessionContext,
} from "@/lib/voice-tutor";

/**
 * Full voice tutor surface — mic orb, transcript, mode + language pickers.
 * Mobile-first; embeds anywhere (route, sheet, scan post-solve).
 */
export function VoiceTutorPanel({
  context,
  grounding,
  className,
  api: external,
}: {
  context?: VoiceSessionContext;
  grounding?: string;
  className?: string;
  api?: UseVoiceTutorApi;
}) {
  const internal = useVoiceTutor({ context, grounding });
  const api = external ?? internal;
  const { status, partial, turns, error, prefs, supported } = api;

  const orbState =
    status === "listening" || status === "thinking" || status === "speaking"
      ? status
      : "idle";

  const cta =
    status === "listening"
      ? { label: "Tap to stop", action: api.stopListening, Icon: MicOff }
      : status === "speaking"
        ? { label: "Tap to interrupt", action: api.stopSpeaking, Icon: Square }
        : { label: "Tap to speak", action: api.startListening, Icon: Mic };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {!supported.stt ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          Your browser doesn't support voice input. You can still type below.
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-3 py-2">
        <VoiceOrb state={orbState} />
        <p className="text-center text-xs text-muted-foreground min-h-[1.25rem]">
          {status === "listening" && (partial || "Listening…")}
          {status === "thinking" && "Aura is thinking…"}
          {status === "speaking" && "Aura is speaking — tap to interrupt"}
          {status === "idle" && "Ask Aura anything — out loud."}
          {status === "error" && (error ?? "Something went off-key. Try again.")}
        </p>
        <Button
          size="lg"
          onClick={() => void cta.action()}
          disabled={status === "thinking"}
          className="press h-12 gap-2 rounded-full px-6"
        >
          <cta.Icon className="h-5 w-5" />
          {cta.label}
        </Button>
      </div>

      <ModeRow prefs={prefs} setMode={api.setMode} setLanguage={api.setLanguage} />

      <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-secondary/30 p-3 max-h-[280px] overflow-y-auto">
        {turns.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">
            Your conversation will appear here.
          </p>
        ) : (
          turns.map((t) => (
            <div
              key={t.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm leading-relaxed",
                t.role === "student"
                  ? "ml-8 bg-primary/10 text-foreground"
                  : "mr-8 bg-background text-foreground/90 border border-border/40",
              )}
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                {t.role === "tutor" ? <Volume2 className="h-3 w-3" /> : <VoiceWaveform active={false} />}
                {t.role === "tutor" ? "Aura" : "You"}
              </div>
              {t.text}
            </div>
          ))
        )}
      </div>

      {turns.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-xs text-muted-foreground"
          onClick={api.reset}
        >
          <RotateCcw className="mr-1 h-3 w-3" /> New conversation
        </Button>
      ) : null}
    </div>
  );
}

function ModeRow({
  prefs,
  setMode,
  setLanguage,
}: {
  prefs: UseVoiceTutorApi["prefs"];
  setMode: UseVoiceTutorApi["setMode"];
  setLanguage: UseVoiceTutorApi["setLanguage"];
}) {
  const modes: VoiceTutorMode[] = ["beginner", "concise", "board", "motivational", "deep"];
  const langs: VoiceLanguage[] = ["en-IN", "kn-IN", "hi-IN", "ur-IN", "hinglish", "kanglish"];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => void setMode(m)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] transition-colors",
              prefs.mode === m
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {VOICE_MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => void setLanguage(l)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] transition-colors",
              prefs.language === l
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {VOICE_LANGUAGE_LABEL[l]}
          </button>
        ))}
      </div>
    </div>
  );
}