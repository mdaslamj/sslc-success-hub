import { BookOpen, ExternalLink, GraduationCap, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Portal = {
  id: string;
  name: string;
  nameKn?: string;
  description: string;
  url: string;
  icon: typeof BookOpen;
  accent: string; // tailwind gradient classes
  tags: string[];
};

const PORTALS: Portal[] = [
  {
    id: "ktbs",
    name: "Karnataka Textbooks (KTBS)",
    nameKn: "ಕರ್ನಾಟಕ ಪಠ್ಯಪುಸ್ತಕಗಳು",
    description:
      "Official KSEAB / KTBS portal. SSLC textbooks in Kannada and English medium, all subjects.",
    url: "https://textbooks.karnataka.gov.in/",
    icon: Landmark,
    accent: "from-amber-500/15 to-rose-500/10 text-amber-700 dark:text-amber-300",
    tags: ["Kannada medium", "English medium", "All subjects"],
  },
  {
    id: "ncert",
    name: "NCERT Textbooks",
    description:
      "National Council of Educational Research and Training reference books — Maths, Science, Social Science and more.",
    url: "https://ncert.nic.in/textbook.php",
    icon: GraduationCap,
    accent: "from-sky-500/15 to-indigo-500/10 text-sky-700 dark:text-sky-300",
    tags: ["English medium", "Reference", "All subjects"],
  },
];

export function OfficialPortals() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Official textbook portals
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PORTALS.map((p) => {
          const Icon = p.icon;
          return (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${p.accent} p-4 shadow-sm transition hover:shadow-card`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/70 backdrop-blur">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {p.name}
                  </h3>
                  {p.nameKn && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                      {p.nameKn}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {p.description}
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="h-5 rounded-full border-success/40 bg-success/10 px-2 text-[10px] text-success"
                >
                  Official
                </Badge>
                {p.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="h-5 rounded-full bg-background/60 px-2 text-[10px] text-muted-foreground"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}