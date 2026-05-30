import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { patchUserProfile } from "@/integrations/firebase/services/users";
import {
  COLLECTIONS,
  db,
  firebaseConfig,
  SCHOOL_SUBCOLLECTIONS,
} from "@/integrations/firebase/config";
import type {
  School,
  SchoolRosterEntry,
  SchoolStudent,
  SubjectSharingPrefs,
  UnitTest,
} from "@/types/school";

const SCHOOLS = COLLECTIONS.SCHOOLS;
const SCHOOL_STUDENTS = COLLECTIONS.SCHOOL_STUDENTS;
const SCHOOL_ROSTER = COLLECTIONS.SCHOOL_ROSTER;
const UNIT_TESTS = COLLECTIONS.UNIT_TESTS;
const TESTS_SUB = SCHOOL_SUBCOLLECTIONS.TESTS;
const STUDENTS_SUB = SCHOOL_SUBCOLLECTIONS.STUDENTS;
const USER_PROFILES = COLLECTIONS.USER_PROFILES;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const SCHOOL_WELCOME_STORAGE_KEY = "aura_school_welcome.v1";
export const PENDING_SCHOOL_JOIN_KEY = "aura.pending_school_join.v1";

export type JoinSchoolResult = {
  success: boolean;
  school?: School;
  error?: string;
};

export type CreateSchoolResult = {
  schoolId: string;
  schoolCode: string;
  schoolEmail: string;
  tempPassword: string;
};

export type CreateSchoolInput = Omit<
  School,
  | "schoolId"
  | "schoolCode"
  | "createdAt"
  | "schoolEmail"
  | "credentialsShownAt"
  | "adminUid"
  | "adminEmail"
  | "sharedLoginUid"
> & {
  /** Principal contact email — not a login; Aura staff use this for outreach. */
  contactEmail: string;
};

export function generateSchoolCode(): string {
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += CODE_CHARS[arr[i] % CODE_CHARS.length];
  return `KAR-${suffix}`;
}

export function generateTempPassword(): string {
  // SECURITY: temp password is a real Firebase Auth credential — must use a
  // CSPRNG, not Math.random().
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const pick = (alphabet: string, n: number): string => {
    const arr = new Uint32Array(n);
    crypto.getRandomValues(arr);
    let out = "";
    for (let i = 0; i < n; i++) out += alphabet[arr[i] % alphabet.length];
    return out;
  };
  return pick(upper, 2) + pick(nums, 2) + pick(lower, 4);
}

function schoolEmailForCode(schoolCode: string): string {
  return `${schoolCode.toLowerCase()}@aura.school`;
}

async function provisionSharedSchoolAccount(
  school: School,
  tempPassword: string,
): Promise<string> {
  const appName = `AuraSchoolProvision-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const secondaryDb = getFirestore(secondaryApp);
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      school.schoolEmail!,
      tempPassword,
    );
    const uid = credential.user.uid;
    const now = Date.now();

    await setDoc(doc(secondaryDb, SCHOOLS, school.schoolId), {
      ...school,
      adminUid: uid,
      sharedLoginUid: uid,
    });

    await setDoc(doc(secondaryDb, USER_PROFILES, uid), {
      uid,
      email: school.schoolEmail,
      displayName: school.name,
      studentName: "",
      classLevel: "10",
      targetScore: 90,
      preferredLanguage: "en",
      weakSubjects: [],
      studyGoals: [],
      role: "school",
      createdAt: now,
      updatedAt: now,
    });

    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

function defaultSubjectSharing(): SubjectSharingPrefs {
  return {
    science: true,
    math: true,
    social: true,
    english: true,
    kannada: true,
    hindi: true,
  };
}

export { defaultSubjectSharing };
export const SCHOOL_CONSENT_VERSION = "1.0";

async function uniqueSchoolCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateSchoolCode();
    const existing = await getSchoolByCode(code);
    if (!existing) return code;
  }
  return `${generateSchoolCode()}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export async function createSchool(data: CreateSchoolInput): Promise<CreateSchoolResult> {
  const schoolId = doc(collection(db, SCHOOLS)).id;
  const schoolCode = await uniqueSchoolCode();
  const schoolEmail = schoolEmailForCode(schoolCode);
  const tempPassword = generateTempPassword();

  const school: School = {
    schoolId,
    schoolCode,
    schoolEmail,
    adminEmail: data.contactEmail,
    createdAt: new Date().toISOString(),
    credentialsShownAt: new Date().toISOString(),
    ...data,
    adminUid: "",
    totalStudents: data.totalStudents ?? 0,
    status: data.status ?? "pending",
  };

  const sharedLoginUid = await provisionSharedSchoolAccount(school, tempPassword);
  school.adminUid = sharedLoginUid;
  school.sharedLoginUid = sharedLoginUid;

  return { schoolId, schoolCode, schoolEmail, tempPassword };
}

/** Called after first shared school login — refreshes activation timestamp. */
export async function activateSchoolAccount(schoolId: string, uid: string): Promise<void> {
  const schoolRef = doc(db, SCHOOLS, schoolId);
  const snap = await getDoc(schoolRef);
  if (!snap.exists()) {
    throw new Error("School not found");
  }
  const school = snap.data() as School;
  if (school.sharedLoginUid !== uid) {
    throw new Error("Not the shared school account for this school.");
  }
  await updateDoc(schoolRef, {
    schoolAccountActivatedAt: new Date().toISOString(),
  });
}

export async function getSchoolByCode(code: string): Promise<School | null> {
  const normalized = code.trim().toUpperCase();
  const q = query(collection(db, SCHOOLS), where("schoolCode", "==", normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as School;
}

/** Exact match first, then prefix match for short codes (e.g. KAR-BGM). */
export async function resolveSchoolByCode(code: string): Promise<School | null> {
  const normalized = code.trim().toUpperCase().replace(/\s/g, "");
  if (!normalized) return null;

  const exact = await getSchoolByCode(normalized);
  if (exact) return exact;

  const prefixQ = query(
    collection(db, SCHOOLS),
    where("schoolCode", ">=", normalized),
    where("schoolCode", "<=", `${normalized}\uf8ff`),
    limit(5),
  );
  const prefixSnap = await getDocs(prefixQ);
  if (prefixSnap.empty) return null;

  const matches = prefixSnap.docs
    .map((d) => d.data() as School)
    .filter((s) => s.schoolCode.startsWith(normalized));

  if (matches.length === 1) return matches[0]!;
  return null;
}

export async function joinSchoolByCode(
  code: string,
  studentUid: string,
  studentName?: string,
): Promise<JoinSchoolResult> {
  const school = await resolveSchoolByCode(code);
  if (!school) {
    return { success: false, error: "School code not found" };
  }

  const schoolId = school.schoolId;
  const studentRef = doc(db, SCHOOL_STUDENTS, schoolId, STUDENTS_SUB, studentUid);
  const existingSnap = await getDoc(studentRef);

  if (existingSnap.exists()) {
    return { success: false, error: "already_joined", school };
  }

  const now = new Date().toISOString();
  const payload: SchoolStudent = {
    uid: studentUid,
    name: studentName?.trim() || "Student",
    joinedAt: now,
    sharingLevel: 2,
    subjectSharing: defaultSubjectSharing(),
    consentGiven: true,
    consentAt: now,
    consentVersion: SCHOOL_CONSENT_VERSION,
    parentConsentGiven: false,
  };

  await setDoc(studentRef, payload);

  await patchUserProfile(studentUid, {
    schoolId,
    schoolCode: school.schoolCode,
    schoolName: school.name,
  });

  return { success: true, school };
}

export async function leaveSchool(studentUid: string, schoolId: string): Promise<void> {
  await deleteDoc(doc(db, SCHOOL_STUDENTS, schoolId, STUDENTS_SUB, studentUid));
  await updateDoc(doc(db, USER_PROFILES, studentUid), {
    schoolId: deleteField(),
    schoolCode: deleteField(),
    schoolName: deleteField(),
    updatedAt: Date.now(),
  });
}

export async function getStudentSchoolMembership(
  studentUid: string,
  schoolId: string,
): Promise<SchoolStudent | null> {
  const snap = await getDoc(doc(db, SCHOOL_STUDENTS, schoolId, STUDENTS_SUB, studentUid));
  if (!snap.exists()) return null;
  return snap.data() as SchoolStudent;
}

export async function updateStudentSubjectSharing(
  studentUid: string,
  schoolId: string,
  subjectSharing: SubjectSharingPrefs,
): Promise<void> {
  const studentRef = doc(db, SCHOOL_STUDENTS, schoolId, STUDENTS_SUB, studentUid);
  await updateDoc(studentRef, { subjectSharing });
}

export async function getSchoolBySharedLoginUid(uid: string): Promise<School | null> {
  const q = query(collection(db, SCHOOLS), where("sharedLoginUid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as School;
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  const snap = await getDoc(doc(db, SCHOOLS, schoolId));
  if (!snap.exists()) return null;
  return snap.data() as School;
}

/** Resolve the school for the signed-in shared account. */
export async function getSchoolForUser(
  uid: string,
  tokenSchoolId?: string | null,
): Promise<School | null> {
  if (tokenSchoolId) {
    const byId = await getSchoolById(tokenSchoolId);
    if (byId?.sharedLoginUid === uid) return byId;
  }
  return getSchoolBySharedLoginUid(uid);
}

export async function linkStudentToSchool(
  schoolId: string,
  studentUid: string,
  rollNumber?: string,
  studentName?: string,
): Promise<void> {
  const studentRef = doc(db, SCHOOL_STUDENTS, schoolId, STUDENTS_SUB, studentUid);
  const existing = await getDoc(studentRef);

  const payload: SchoolStudent = existing.exists()
    ? {
        ...(existing.data() as SchoolStudent),
        ...(rollNumber ? { rollNumber } : {}),
        ...(studentName ? { name: studentName } : {}),
      }
    : {
        uid: studentUid,
        rollNumber,
        name: studentName ?? "Student",
        joinedAt: new Date().toISOString(),
        sharingLevel: 2,
        subjectSharing: defaultSubjectSharing(),
        consentGiven: false,
        parentConsentGiven: false,
      };

  await setDoc(studentRef, payload, { merge: true });
}

export async function getSchoolStudents(schoolId: string): Promise<SchoolStudent[]> {
  const snap = await getDocs(collection(db, SCHOOL_STUDENTS, schoolId, STUDENTS_SUB));
  return snap.docs.map((d) => d.data() as SchoolStudent);
}

export async function isSchoolAccount(uid: string, schoolId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, SCHOOLS, schoolId));
  if (!snap.exists()) return false;
  const school = snap.data() as School;
  return school.sharedLoginUid === uid;
}

export type RosterSaveMatch = {
  rollNumber: string;
  studentName: string;
  auraUid: string | null;
  confirmed: boolean;
};

export async function saveRoster(
  schoolId: string,
  matches: RosterSaveMatch[],
): Promise<number> {
  const confirmedMatches = matches.filter((m) => m.confirmed && m.auraUid);
  if (confirmedMatches.length === 0) return 0;

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const match of confirmedMatches) {
    const entry: SchoolRosterEntry = {
      rollNumber: match.rollNumber,
      studentName: match.studentName,
      auraUid: match.auraUid!,
      confirmedAt: now,
    };
    batch.set(
      doc(db, SCHOOL_ROSTER, schoolId, STUDENTS_SUB, match.rollNumber),
      entry,
    );
  }

  await batch.commit();
  return confirmedMatches.length;
}

export async function getSchoolRosterEntries(schoolId: string): Promise<SchoolRosterEntry[]> {
  const snap = await getDocs(collection(db, SCHOOL_ROSTER, schoolId, STUDENTS_SUB));
  return snap.docs.map((d) => d.data() as SchoolRosterEntry);
}

export async function hasSchoolRoster(schoolId: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, SCHOOL_ROSTER, schoolId, STUDENTS_SUB), limit(1)),
  );
  return !snap.empty;
}

export function normalizeRollNumber(rollNumber: string): string {
  return rollNumber.trim();
}

/** Build roll-number → roster entry map (handles leading-zero variants). */
export function buildRosterLookupMap(
  entries: SchoolRosterEntry[],
): Map<string, SchoolRosterEntry> {
  const map = new Map<string, SchoolRosterEntry>();
  for (const entry of entries) {
    const key = normalizeRollNumber(entry.rollNumber);
    map.set(key, entry);
    const stripped = key.replace(/^0+/, "");
    if (stripped && stripped !== key) {
      map.set(stripped, entry);
    }
    if (/^\d+$/.test(key)) {
      map.set(key.padStart(3, "0"), entry);
    }
  }
  return map;
}

export async function getSchoolRosterEntry(
  schoolId: string,
  rollNumber: string,
): Promise<SchoolRosterEntry | null> {
  const key = normalizeRollNumber(rollNumber);
  const snap = await getDoc(doc(db, SCHOOL_ROSTER, schoolId, STUDENTS_SUB, key));
  if (snap.exists()) return snap.data() as SchoolRosterEntry;

  const stripped = key.replace(/^0+/, "");
  if (stripped && stripped !== key) {
    const alt = await getDoc(doc(db, SCHOOL_ROSTER, schoolId, STUDENTS_SUB, stripped));
    if (alt.exists()) return alt.data() as SchoolRosterEntry;
  }

  if (/^\d+$/.test(key)) {
    const padded = key.padStart(3, "0");
    if (padded !== key) {
      const alt = await getDoc(doc(db, SCHOOL_ROSTER, schoolId, STUDENTS_SUB, padded));
      if (alt.exists()) return alt.data() as SchoolRosterEntry;
    }
  }

  return null;
}

export async function saveUnitTest(schoolId: string, test: UnitTest): Promise<void> {
  await setDoc(doc(db, UNIT_TESTS, schoolId, TESTS_SUB, test.testId), test);
}
