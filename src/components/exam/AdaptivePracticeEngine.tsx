import React, { useEffect, useState, useMemo } from "react"
import { Question, QuestionAttempt, Subject } from "../../types/question"
import { useExamEngine } from "../../hooks/useExamEngine"
import { QuestionCard } from "./QuestionCard"
import { QuestionNavigator } from "./QuestionNavigator"
import { MidSessionCheckIn } from "./MidSessionCheckIn"
import { getSessionInsights } from "../../engines/analytics/sessionAnalytics"
import { readAllAttempts } from "../../engines/analytics/attemptLogger"
import { readProfile } from "../../engines/analytics/profileUpdater"
import {
  buildAdaptiveSession,
  shouldTriggerRecovery,
  getRecoveryQuestions,
} from "../../engines/adaptive/difficultyEngine"
import {
  getMisconceptionHint,
  getChapterMisconceptionFlag,
} from "../../engines/adaptive/misconceptionDetector"

interface AdaptivePracticeEngineProps {
  questions: Question[]
  chapterId: string
  subject: Subject
  sessionLength?: number
  onSessionComplete?: (attempts: QuestionAttempt[], score: number) => void
}

export function AdaptivePracticeEngine({
  questions,
  chapterId,
  subject,
  sessionLength = 10,
  onSessionComplete,
}: AdaptivePracticeEngineProps) {
  const profile = useMemo(() => readProfile(), [])

  // Build adaptive session order upfront
  const adaptiveQuestions = useMemo(
    () => buildAdaptiveSession(questions, chapterId, sessionLength, profile),
    [questions, chapterId, sessionLength]
  )

  const {
    state,
    actions,
    questionStatuses,
    canGoNext,
    canGoPrev,
    isLastQuestion,
    isComplete,
  } = useExamEngine(adaptiveQuestions, "practice")

  const [showCheckIn, setShowCheckIn] = useState(false)
  const [lastCheckInAt, setLastCheckInAt] = useState(0)
  const [showRecovery, setShowRecovery] = useState(false)

  const recentAttempts = useMemo(() => {
    try { return readAllAttempts() } catch { return [] }
  }, [state.currentIndex])

  const daysSince = useMemo(() => {
    if (!state.currentQuestion) return undefined
    const chAttempts = recentAttempts.filter(
      (a) => a.chapterId === state.currentQuestion!.chapterId
    )
    if (chAttempts.length === 0) return undefined
    const last = Math.max(...chAttempts.map((a) => a.timestamp))
    return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
  }, [recentAttempts, state.currentQuestion])

  // Mid-session check-in every 5 answered
  useEffect(() => {
    const answered = state.attemptedCount
    if (
      answered > 0 &&
      answered % 5 === 0 &&
      answered !== lastCheckInAt &&
      state.confidenceSelection !== null
    ) {
      setLastCheckInAt(answered)
      setShowCheckIn(true)
    }
  }, [state.attemptedCount, state.confidenceSelection, lastCheckInAt])

  // Recovery mode trigger
  useEffect(() => {
    if (state.isChecked && state.isCorrect === false) {
      if (shouldTriggerRecovery(chapterId)) {
        setShowRecovery(true)
      }
    }
  }, [state.isChecked, state.isCorrect])

  const sessionInsight = useMemo(
    () => getSessionInsights(state.sessionAttempts, recentAttempts),
    [state.sessionAttempts, recentAttempts]
  )

  // Misconception hint for current question
  const misconceptionHint = useMemo(() => {
    if (!state.currentQuestion || !state.isChecked || state.isCorrect) return null
    return getMisconceptionHint(
      state.currentQuestion.chapterId,
      state.currentQuestion.concept,
      state.currentQuestion.commonMistakes
    )
  }, [state.currentQuestion, state.isChecked, state.isCorrect])

  // Chapter misconception flag
  const misconceptionFlag = useMemo(
    () => getChapterMisconceptionFlag(chapterId),
    [chapterId]
  )

  useEffect(() => {
    if (isComplete && onSessionComplete) {
      onSessionComplete(state.sessionAttempts, state.score)
    }
  }, [isComplete])

  if (adaptiveQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No questions available for this chapter yet.</p>
      </div>
    )
  }

  if (isComplete) {
    const correct = questionStatuses.filter((s) => s === "correct").length
    const wrong   = questionStatuses.filter((s) => s === "wrong").length
    const accuracy = Math.round((correct / adaptiveQuestions.length) * 100)

    return (
      <div className="flex flex-col items-center gap-6 py-10 px-4 text-center">
        <div className="text-5xl">
          {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}
        </div>
        <div>
          <p className="text-2xl font-medium text-gray-900 dark:text-gray-100">
            {accuracy}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {correct} correct · {wrong} wrong · {adaptiveQuestions.length} total
          </p>
        </div>
        {wrong > 0 && (
          <button
            onClick={actions.retryWrongQuestions}
            className="px-6 py-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 transition-all"
          >
            Retry {wrong} wrong questions
          </button>
        )}
        <button
          onClick={actions.reset}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Start over
        </button>
      </div>
    )
  }

  if (!state.currentQuestion) return null

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto px-4 pb-10">
      {/* Recovery mode banner */}
      {showRecovery && (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 px-4 py-3 flex items-start gap-3">
          <span className="text-lg flex-shrink-0">🔄</span>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Taking a quick breather
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-0.5">
              Aura is switching to an easier chapter to rebuild momentum before continuing.
            </p>
          </div>
          <button
            onClick={() => setShowRecovery(false)}
            className="ml-auto text-blue-400 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Misconception flag for this chapter */}
      {misconceptionFlag.hasMisconception && !showRecovery && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-start gap-3
            ${misconceptionFlag.severity === "high"
              ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
            }`}
        >
          <span className="text-lg flex-shrink-0">
            {misconceptionFlag.severity === "high" ? "⚠️" : "💡"}
          </span>
          <p
            className={`text-xs leading-relaxed
              ${misconceptionFlag.severity === "high"
                ? "text-red-700 dark:text-red-300"
                : "text-amber-700 dark:text-amber-300"
              }`}
          >
            Aura detected a possible misconception in this chapter.
            Focus on understanding, not just practice.
          </p>
        </div>
      )}

      {/* Mid-session check-in */}
      {showCheckIn && (
        <MidSessionCheckIn
          insight={sessionInsight}
          questionNumber={state.attemptedCount}
          onContinue={() => setShowCheckIn(false)}
        />
      )}

      {/* Question card */}
      <QuestionCard
        key={`${chapterId}-${state.currentQuestion.id}`}
        question={state.currentQuestion}
        selectedOption={state.selectedOption}
        isChecked={state.isChecked}
        isCorrect={state.isCorrect}
        showExplanation={state.showExplanation}
        confidenceSelection={state.confidenceSelection}
        mistakeTag={state.mistakeTag}
        onSelectOption={actions.selectOption}
        onCheckAnswer={actions.checkAnswer}
        onConfidenceSelect={actions.setConfidence}
        onMistakeTagSelect={actions.setMistakeTag}
        recentAttempts={recentAttempts}
        daysSinceLastAttempt={daysSince}
        misconceptionHint={misconceptionHint}
      />

      <QuestionNavigator
        currentIndex={state.currentIndex}
        total={state.totalQuestions}
        statuses={questionStatuses}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        isLastQuestion={isLastQuestion}
        isChecked={state.isChecked}
        confidenceSelected={state.confidenceSelection !== null}
        isRetryMode={state.isRetryMode}
        onPrevious={actions.previousQuestion}
        onNext={actions.nextQuestion}
        onGoTo={actions.goToQuestion}
        onRetry={actions.retryWrongQuestions}
        onComplete={() => onSessionComplete?.(state.sessionAttempts, state.score)}
      />
    </div>
  )
}
