## Handwritten Answer Upload System

Build a scalable answer-upload feature using Firebase Storage + Firestore, integrated into quizzes, mock exams, and chapter practice without redesigning the app.

### Data Model (Firestore)

**`answerUploads`** — one doc per uploaded image
- `id`, `userId`, `attemptId` (FK → answerAttempts), `questionId` (optional)
- `storagePath`, `downloadUrl`, `thumbnailUrl?`
- `width`, `height`, `sizeBytes`, `mimeType`
- `preprocessing`: `{ rotation, brightness, contrast, cropped }`
- `ocr`: `{ status: "pending"|"done"|"skipped", text?, confidence? }` (future)
- `evaluation`: `{ status, score?, rubric?, feedback? }` (future)
- `createdAt`

**`answerAttempts`** — one doc per submission session
- `id`, `userId`, `context: { type: "quiz"|"mock"|"chapter", refId, subjectId?, chapterId? }`
- `imageIds: string[]`, `notes?`
- `status: "draft"|"submitted"|"evaluated"`
- `aiEvaluation?: { totalScore, maxScore, breakdown[] }` (future)
- `createdAt`, `submittedAt?`

### Firebase Storage

- Bucket path: `answer-uploads/{userId}/{attemptId}/{imageId}.jpg`
- Storage rules: only owner can read/write own folder

### Components

- `src/components/answer-upload/AnswerUploadDialog.tsx` — main modal (camera + gallery, multi-image)
- `src/components/answer-upload/ImageEditor.tsx` — crop/rotate/brightness using canvas (no heavy deps)
- `src/components/answer-upload/UploadButton.tsx` — reusable trigger button
- `src/components/answer-upload/AnswerUploadHistory.tsx` — list past attempts

### Services / Hooks

- `src/integrations/firebase/services/answer-uploads.ts` — CRUD for both collections + Storage upload
- `src/hooks/use-answer-upload.ts` — upload state, progress, preprocessing pipeline
- `src/hooks/use-answer-history.ts` — fetch user's past attempts

### Integration Points (non-invasive)

- Add `<UploadButton context={{type:"quiz", refId}} />` in:
  - `src/routes/quiz.$quizId.tsx` (after submit screen)
  - `src/routes/exams.$examId.tsx` (per-question and final)
  - `src/routes/subjects.$subjectId.tsx` (chapter practice block)
- New route `src/routes/answer-uploads.tsx` — full history page
- Sidebar link "My Answers"

### Image Preprocessing

Use HTML5 Canvas (no external libs):
- Rotate: 90°/180°/270° via canvas transform
- Crop: draggable rect overlay, output cropped canvas
- Brightness/contrast: per-pixel filter via `ctx.filter = "brightness() contrast()"`
- Auto-enhance: combined brightness +10%, contrast +15%

Re-encode as JPEG quality 0.85 before upload to keep size small.

### Future-Ready Architecture

- `ocr` and `evaluation` fields on `answerUploads` start as `{status:"pending"}`
- `aiEvaluation` on `answerAttempts` left null
- Service layer exposes `triggerOcr(uploadId)` and `triggerEvaluation(attemptId)` stubs that just mark status — wired later to Lovable AI Gateway with vision-capable models (gemini-2.5-pro / gpt-5)
- Rubric schema reserved: `{ criterion, weight, score, comment }[]`

### Firestore Rules

Add to `firestore.rules`:
- `answerUploads/{id}` and `answerAttempts/{id}`: read/write only if `request.auth.uid == resource.data.userId`

### Out of scope (this round)

- Actual OCR/AI evaluation calls
- PDF export
- Teacher/parent review UI
- No redesign of existing screens — additions only
