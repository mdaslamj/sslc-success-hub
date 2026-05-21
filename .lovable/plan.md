## Switch default theme to light

The app already has full light-mode tokens defined in `src/styles.css` (`:root` block at line 72). The issue is the default theme is `"system"` and falls back to dark — so on dark-mode devices the app renders dark.

### Change

**`src/contexts/theme-context.tsx`**
- Change the initial `ThemeMode` default from `"system"` to `"light"` (both the `useState` initializer and the SSR fallback).
- Change the `resolved` initial state from `"dark"` to `"light"` so first paint is light.

That's it — no token changes needed. Users can still switch back to dark via the theme toggle in settings; this just changes the default for anyone without a saved preference.