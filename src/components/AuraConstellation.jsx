import { memo, useCallback, useMemo, useState } from "react";

const SUBJECT_LAYOUT = [
  { id: "science", cx: 160, cy: 60, short: "Sci", color: "#38BDF8" },
  { id: "math", cx: 272, cy: 130, short: "Math", color: "#FBBF24" },
  { id: "social", cx: 272, cy: 230, short: "Social", color: "#4ADE80" },
  { id: "hindi", cx: 160, cy: 290, short: "Hin", color: "#F472B6" },
  { id: "kannada", cx: 48, cy: 230, short: "Kan", color: "#FB923C" },
  { id: "english", cx: 48, cy: 130, short: "Eng", color: "#C084FC" },
];

const RING_EDGES = [
  ["science", "math"],
  ["math", "social"],
  ["social", "hindi"],
  ["hindi", "kannada"],
  ["kannada", "english"],
  ["english", "science"],
];

const LAYOUT_BY_ID = Object.fromEntries(SUBJECT_LAYOUT.map((s) => [s.id, s]));

/** Stars dim with low mastery but never disappear (min opacity 0.12). */
function starOpacity(mastery) {
  const m = Math.max(0, Math.min(100, mastery ?? 0));
  return (m / 100) * 0.88 + 0.12;
}

function starRadius(blueprintMarks) {
  return Math.max(2.5, Math.min(5.5, (blueprintMarks ?? 4) / 4));
}

function contextualLine({ burnoutScore, momentumScore, overallMastery }) {
  if (burnoutScore > 70) return "Your constellation needs recovery. Rest tonight.";
  if (momentumScore > 70) return "Strong momentum. Your constellation is expanding.";
  if (overallMastery < 50) return "Your constellation is taking shape. Keep going.";
  return "Every session lights another star.";
}

function momentumBackground(momentumScore) {
  if (momentumScore > 70) {
    return "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)";
  }
  if (momentumScore >= 40) {
    return "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 60%)";
  }
  return "#08080E";
}

function SubjectConstellation({
  id,
  cx,
  cy,
  short,
  color,
  subject,
  subjectChapters,
  pulseSubject,
  onTap,
}) {
  const subjectColor = subject?.color ?? color;
  const total = Math.max(subjectChapters.length, 1);
  const scale = pulseSubject === id ? 1.12 : 1;
  const labelOpacity = (subject?.mastery ?? 0) < 40 ? 0.55 : 0.8;

  const stars = useMemo(
    () =>
      subjectChapters.map((ch, index) => {
        const angle = (index / total) * Math.PI * 2;
        const orbit = 18 + (ch.blueprintMarks ?? 4) / 2;
        const mastery = ch.mastery ?? 0;
        return {
          ...ch,
          starX: cx + Math.cos(angle) * orbit,
          starY: cy + Math.sin(angle) * orbit,
          r: starRadius(ch.blueprintMarks),
          opacity: starOpacity(mastery),
          glow: mastery > 70,
        };
      }),
    [subjectChapters, total, cx, cy],
  );

  return (
    <g
      style={{
        cursor: "pointer",
        transform: `translate(${cx}px, ${cy}px) scale(${scale}) translate(${-cx}px, ${-cy}px)`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: "transform 200ms ease",
      }}
      onClick={() => onTap(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap(id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${subject?.name ?? short} constellation`}
    >
      {stars.length > 1 &&
        stars.map((star, i) => {
          const next = stars[(i + 1) % stars.length];
          return (
            <line
              key={`line-${star.id}`}
              x1={star.starX}
              y1={star.starY}
              x2={next.starX}
              y2={next.starY}
              stroke={subjectColor}
              strokeOpacity={0.08}
              strokeWidth="1"
            />
          );
        })}

      {stars.map((star) => (
        <circle
          key={star.id}
          cx={star.starX}
          cy={star.starY}
          r={star.r}
          fill={subjectColor}
          opacity={star.opacity}
          filter={star.glow ? "url(#constellation-glow)" : undefined}
        />
      ))}

      <text
        x={cx}
        y={cy}
        dy={26}
        fill={subjectColor}
        opacity={labelOpacity}
        fontSize="9"
        textAnchor="middle"
        style={{ fontFamily: "Plus Jakarta Sans, sans-serif", pointerEvents: "none" }}
      >
        {short}
      </text>
    </g>
  );
}

const MemoSubjectConstellation = memo(SubjectConstellation);

/**
 * Aura Constellation — living SVG mirror of academic transformation.
 * Pure presentation: all data comes from props (academic-state graph).
 */
function AuraConstellation({
  subjects,
  chapters,
  burnoutScore,
  momentumScore,
  onSubjectTap,
}) {
  const [pulseSubject, setPulseSubject] = useState(null);

  const chaptersBySubject = useMemo(() => {
    const map = {};
    for (const layoutItem of SUBJECT_LAYOUT) {
      map[layoutItem.id] = chapters.filter((ch) => ch.subjectId === layoutItem.id);
    }
    return map;
  }, [chapters]);

  const overallReadiness = useMemo(() => {
    const list = Object.values(subjects ?? {});
    if (!list.length) return 0;
    return Math.round(
      list.reduce((sum, s) => sum + (s.predicted ?? 0), 0) / list.length,
    );
  }, [subjects]);

  const overallMastery = useMemo(() => {
    const list = Object.values(subjects ?? {});
    if (!list.length) return 0;
    return list.reduce((sum, s) => sum + (s.mastery ?? 0), 0) / list.length;
  }, [subjects]);

  const fogOpacity = burnoutScore > 50 ? ((burnoutScore - 50) / 100) * 0.45 : 0;
  const contextLine = contextualLine({ burnoutScore, momentumScore, overallMastery });

  const handleSubjectTap = useCallback(
    (subjectId) => {
      setPulseSubject(subjectId);
      window.setTimeout(() => setPulseSubject(null), 200);
      onSubjectTap?.(subjectId);
    },
    [onSubjectTap],
  );

  return (
    <section className="w-full">
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[rgba(240,240,248,0.70)]">
        Your constellation
      </p>

      <div
        className="relative w-full overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)]"
        style={{ background: momentumBackground(momentumScore) }}
      >
        <svg
          viewBox="0 0 320 320"
          className="block h-auto w-full max-w-[min(100%,420px)] mx-auto"
          role="img"
          aria-label="Aura academic constellation"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="constellation-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {RING_EDGES.map(([a, b]) => {
            const from = LAYOUT_BY_ID[a];
            const to = LAYOUT_BY_ID[b];
            return (
              <line
                key={`${a}-${b}`}
                x1={from.cx}
                y1={from.cy}
                x2={to.cx}
                y2={to.cy}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            );
          })}

          {SUBJECT_LAYOUT.map((layout) => (
            <MemoSubjectConstellation
              key={layout.id}
              {...layout}
              subject={subjects?.[layout.id]}
              subjectChapters={chaptersBySubject[layout.id] ?? []}
              pulseSubject={pulseSubject}
              onTap={handleSubjectTap}
            />
          ))}

          <g>
            <circle
              cx={160}
              cy={160}
              r={28}
              fill="rgba(139,92,246,0.06)"
              stroke="rgba(139,92,246,0.15)"
              strokeWidth="1"
              className={momentumScore > 60 ? "aura-constellation-pulse-outer" : undefined}
            />
            <circle
              cx={160}
              cy={160}
              r={20}
              fill="rgba(139,92,246,0.08)"
              className={momentumScore > 60 ? "aura-constellation-pulse-inner" : undefined}
            />
            <text
              x={160}
              y={160}
              dy={3}
              fill="#8B5CF6"
              fontSize="8"
              fontWeight="bold"
              textAnchor="middle"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              AURA
            </text>
            <text
              x={160}
              y={160}
              dy={14}
              fill="rgba(240,240,248,0.70)"
              fontSize="7"
              textAnchor="middle"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              {overallReadiness}%
            </text>
          </g>

          {fogOpacity > 0 && (
            <rect
              x={0}
              y={0}
              width={320}
              height={320}
              fill="rgba(8,8,14,0.92)"
              opacity={fogOpacity}
              pointerEvents="none"
            />
          )}
        </svg>
      </div>

      <div className="mt-3 flex w-full items-center justify-between gap-1 px-1">
        {SUBJECT_LAYOUT.map(({ id, short, color }) => {
          const subject = subjects?.[id];
          const subjectColor = subject?.color ?? color;
          return (
            <div key={id} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: subjectColor }}
              />
              <span className="truncate text-[10px] text-[rgba(240,240,248,0.70)]">{short}</span>
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ fontFamily: "JetBrains Mono, monospace", color: subjectColor }}
              >
                {Math.round(subject?.mastery ?? 0)}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs italic text-[rgba(240,240,248,0.70)]">{contextLine}</p>
    </section>
  );
}

export default memo(AuraConstellation);
