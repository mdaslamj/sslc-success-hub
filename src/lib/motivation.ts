/** Small library of motivational messages used by Focus Mode + timer.
 *  Pure data — easy to swap with AI-generated copy later. */

export const FOCUS_START_MESSAGES = [
  "Lock in. One chapter at a time.",
  "Small steps every day beat cramming.",
  "Future-you is watching. Make them proud.",
  "Deep work for 25 — distractions can wait.",
  "ಒಂದು ಗಂಟೆ ಗಮನ — ಒಂದು ಜೀವನ ಬದಲಾವಣೆ.",
];

export const FOCUS_COMPLETE_MESSAGES = [
  "Nice work. That's another brick in the wall.",
  "Streak protected. Take a breath.",
  "Focus muscle is getting stronger.",
  "Compounding effort — keep going.",
  "Well done. Hydrate and reset.",
];

export const BREAK_MESSAGES = [
  "Stand up. Look 20 ft away for 20 seconds.",
  "Stretch your shoulders. Roll your neck.",
  "Sip water. Breathe slowly.",
  "Walk a lap. Refresh the mind.",
];

export function pickRandom<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
