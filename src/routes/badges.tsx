import { createFileRoute } from '@tanstack/react-router'
import BadgesPage from '@/pages/BadgesPage'
export const Route = createFileRoute('/badges')({
  component: BadgesPage,
})
