## Goal
Restore a working preview and confirm whether the issue is environment-related or caused by recent app changes.

## Findings
- The sandbox Vite server is currently starting normally and reports ready on port 8080.
- The published site is serving the app correctly.
- The preview URL is serving the Lovable placeholder shell instead of the app, which points more to a preview/deployment state problem than a current route crash.
- Core TanStack bootstrap files are present and structurally valid:
  - `src/start.ts`
  - `src/routes/__root.tsx`
  - `src/routes/index.tsx`
  - `vite.config.ts`
- I did not find a current runtime stack trace from the preview snapshot.

## Plan
1. Validate preview infrastructure state
   - Check the current preview/deployment status and confirm whether the preview environment is actually attached to the latest project state.
   - Confirm the active preview URL and whether it is serving the current build artifact.

2. Reproduce the preview boot path
   - Open the sandbox preview directly and verify whether the app renders there.
   - Compare sandbox rendering with the hosted preview URL to separate app-code issues from preview hosting issues.

3. Check for build or hydration blockers from recent changes
   - Inspect the latest dev/build output for route-tree mismatches, SSR/hydration errors, or import resolution failures.
   - Pay special attention to recent generated-file drift such as `src/routeTree.gen.ts` and any Aura-related type or SSR regressions.

4. Apply the smallest fix only if code is actually responsible
   - If the issue is a route/bootstrap mismatch, fix the affected route or startup wiring.
   - If the issue is preview environment drift, avoid unrelated code edits and instead refresh/restart the preview path.

5. Restore preview availability
   - Restart the preview/dev environment if needed.
   - Re-sync the latest repository state into the preview environment.
   - Re-deploy so the hosted preview points at the corrected/latest build.

6. Verify end to end
   - Confirm Vite/server startup is clean.
   - Confirm routing loads `/` without a blank screen.
   - Confirm the preview URL serves the app, not the placeholder shell.
   - Confirm the published deployment remains healthy.

## Technical notes
- Current evidence suggests the app code is not in a hard-failed startup state right now.
- The most likely first branch is preview environment/deployment desync.
- I will avoid touching engine or hook files unless a proven blocker requires it, and I’ll keep any code changes limited to routing/bootstrap if necessary.