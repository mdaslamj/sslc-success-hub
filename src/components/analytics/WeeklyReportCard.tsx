import React, { useMemo, useRef } from "react"
import { Subject } from "../../types/question"
import { buildWeeklyReport, WeeklyReport } from "../../engines/analytics/sessionAnalytics"
import { detectMisconceptions } from "../../engines/adaptive/misconceptionDetector"
import { getBlueprint } from "../../lib/blueprintUtils"
import { readProfile } from "../../engines/analytics/profileUpdater"

interface WeeklyReportCardProps {
  subject: Subject
}

function StatRow({
  label,
  value,
  sub,
  delta,
}: {
  label: string
  value: string
  sub?: string
  delta?: number | null
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
        {delta !== null && delta !== undefined && (
          <p
            className={`text-xs mt-0.5 ${
              delta > 0
                ? "text-green-600 dark:text-green-400"
                : delta < 0
                ? "text-red-500 dark:text-red-400"
                : "text-gray-400"
            }`}
          >
            {delta > 0 ? `+${delta}%` : `${delta}%`} vs last week
          </p>
        )}
      </div>
    </div>
  )
}

function PressureBar({ delta }: { delta: number }) {
  const isHigh = delta > 15
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Exam pressure gap
      </p>
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Practice accuracy</span>
          </div>
          <div className="h-2 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Timed accuracy</span>
          </div>
          <div className="h-2 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ width: `${Math.max(0, 100 - delta)}%` }}
            />
          </div>
        </div>
      </div>
      {isHigh && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {delta}% drop under time pressure — practice more timed sessions.
        </p>
      )}
    </div>
  )
}

export function WeeklyReportCard({ subject }: WeeklyReportCardProps) {
  const report = useMemo(() => buildWeeklyReport(subject), [subject])
  const misconceptions = useMemo(() => detectMisconceptions(subject), [subject])
  const profile = useMemo(() => readProfile(), [])
  const bp = getBlueprint(subject)

  const cardRef = useRef<HTMLDivElement>(null)

  if (!report) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-3xl">📊</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Not enough data yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
          Complete at least 20 questions this week to unlock your Aura report.
        </p>
      </div>
    )
  }

  const subjectLabel = subject

  return (
    <div className="space-y-5 max-w-lg mx-auto px-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Weekly Aura Report
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {subjectLabel} · {report.totalAttempts} questions this week
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-medium text-gray-900 dark:text-gray-100">
            {report.weekAccuracy}%
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">accuracy</p>
        </div>
      </div>

      {/* Insight line — the single most important takeaway */}
      <div className="rounded-xl bg-gray-900 dark:bg-gray-100 px-4 py-3">
        <p className="text-sm text-white dark:text-gray-900 leading-relaxed">
          {report.insightLine}
        </p>
      </div>

      {/* Accuracy + speed stats */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
        <StatRow
          label="Accuracy this week"
          value={`${report.weekAccuracy}%`}
          delta={report.accuracyDelta}
        />
        {report.avgSpeedMs && (
          <StatRow
            label="Average time per question"
            value={`${Math.round(report.avgSpeedMs / 1000)}s`}
            sub="Faster = stronger command"
          />
        )}
        {report.strongestChapter && (
          <StatRow
            label="Strongest chapter"
            value="↑"
            sub={report.strongestChapter}
          />
        )}
        {report.weakestCriticalChapter && (
          <StatRow
            label="Needs focus"
            value="⚠"
            sub={`${report.weakestCriticalChapter} — high board marks`}
          />
        )}
      </div>

      {/* Pressure gap */}
      {report.pressureDelta !== null && report.pressureDelta > 5 && (
        <PressureBar delta={report.pressureDelta} />
      )}

      {/* Misconceptions */}
      {misconceptions.length > 0 && (
        <div className="rounded-xl border border-amber-100 dark:border-amber-900 p-4 space-y-3">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            ⚠ Possible misconceptions detected
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            These are concepts where you answered wrong with high confidence — not a knowledge gap but a wrong belief.
          </p>
          {misconceptions.slice(0, 3).map((m) => (
            <div key={`${m.chapterId}-${m.concept}`} className="flex items-start gap-2">
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  m.severity === "high"
                    ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                }`}
              >
                {m.count}×
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                {m.concept}
              </p>
            </div>
          ))}
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">
            Revisit these concepts — not just practice more questions.
          </p>
        </div>
      )}

      {/* Shareable card */}
      <div ref={cardRef} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-900 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            My Aura Report · {subjectLabel}
          </p>
          <p className="text-xs text-gray-300 dark:text-gray-600">
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
        <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {report.weekAccuracy}%
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {report.insightLine}
        </p>
        <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500 pt-1">
          <span>{report.totalAttempts} questions</span>
          {report.accuracyDelta !== null && (
            <span className={report.accuracyDelta >= 0 ? "text-green-500" : "text-red-400"}>
              {report.accuracyDelta >= 0 ? "+" : ""}{report.accuracyDelta}% vs last week
            </span>
          )}
        </div>
        <p className="text-xs text-gray-200 dark:text-gray-700">Powered by Aura</p>
      </div>

      {/* Copy insight */}
      <button
        onClick={() => {
          const text = `My Aura Report — ${subjectLabel}\n${report.weekAccuracy}% accuracy this week\n\n${report.insightLine}\n\n${report.totalAttempts} questions practiced`
          navigator.clipboard.writeText(text).catch(() => {})
        }}
        className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
      >
        Copy report summary
      </button>
    </div>
  )
}
