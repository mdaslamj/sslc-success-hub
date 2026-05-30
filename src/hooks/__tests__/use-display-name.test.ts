import assert from "node:assert/strict";
import {
  isDemoDisplayName,
  migrateDemoProfileName,
  resolveDisplayName,
} from "@/lib/student-display-name";
import { toProfileStorage } from "@/hooks/useStudentProfile";
import { createEmptyStudentProfile } from "@/lib/emptyStudentProfile";

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
      ...createEmptyStudentProfile(),
      student: { ...createEmptyStudentProfile().student, name: "Arjun Kumar" },
    },
    {},
  ),
);
assert.equal(migrated.student.name, "Student");

console.log("use-display-name tests passed");
