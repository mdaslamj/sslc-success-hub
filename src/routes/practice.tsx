import { createFileRoute } from '@tanstack/react-router'
import PracticePage from '@/pages/PracticePage'

export const Route = createFileRoute('/practice')({
  component: PracticePage,
})
