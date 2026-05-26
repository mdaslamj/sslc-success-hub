import { createFileRoute } from '@tanstack/react-router'
import MockExamPage from '@/pages/MockExamPage'

export const Route = createFileRoute('/mock-exam')({
  component: MockExamPage,
})
