import { createFileRoute } from '@tanstack/react-router'
import DailyPracticePage from '@/pages/DailyPracticePage'
export const Route = createFileRoute('/daily-practice')({
  component: DailyPracticePage,
})
