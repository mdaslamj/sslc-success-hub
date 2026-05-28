import assert from "node:assert/strict";
import {
  isDemoDisplayName,
  migrateDemoProfileName,
  resolveDisplayName,
} from "@/lib/student-display-name";
import { toProfileStorage, loadSeedProfile } from "@/hooks/useStudentProfile";

assert.equal(isDemoDisplayName("Arjun Kumar"), true);
assert.equal(isDemoDisplayName("Priya"), false);

assert.equal(
  resolveDisplayName({
    authProfile: { studentName: "Meera S" } as never,
  }),
  "Meera S",
);

assert.equal(
  resolveDisplayName({
    guestName: "Guest Learner",
  }),
  "Guest Learner",
);

assert.equal(resolveDisplayName({}), "Student");

const migrated = migrateDemoProfileName(
  toProfileStorage(
    {
      ...loadSeedProfile(),
      student: { ...loadSeedProfile().student, name: "Arjun Kumar" },
    },
    {},
  ),
);
assert.equal(migrated.student.name, "Student");

console.log("use-display-name tests passed");
