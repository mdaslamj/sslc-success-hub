import { createFileRoute } from '@tanstack/react-router'
import RevisionNotesPage from '@/pages/RevisionNotesPage'
export const Route = createFileRoute('/revision')({
  component: RevisionNotesPage,
})
