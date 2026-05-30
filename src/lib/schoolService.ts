import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db, COLLECTIONS, SCHOOL_SUBCOLLECTIONS } from "@/integrations/firebase/config";
import type {
  School,
  SchoolStudent,
  SubjectSharingPrefs,
} from "@/types/school";

const SCHOOLS = COLLECTIONS.SCHOOLS;
const SCHOOL_TEACHERS = COLLECTIONS.SCHOOL_TEACHERS;
const SCHOOL_STUDENTS = COLLECTIONS.SCHOOL_STUDENTS;
const TEACHERS_SUB = SCHOOL_SUBCOLLECTIONS.TEACHERS;
const STUDENTS_SUB = SCHOOL_SUBCOLLECTIONS.STUDENTS;

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSchoolCode(): string {
  const suffix = Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
  return `KAR-${suffix}`;
}

function defaultSubjectSharing(): SubjectSharingPrefs {
  return {
    science: true,
    math: true,
    social: true,
    english: false,
    kannada: false,
    hindi: false,
  };
}

async function uniqueSchoolCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateSchoolCode();
    const existing = await getSchoolByCode(code);
    if (!existing) return code;
  }
  return `${generateSchoolCode()}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export async function createSchool(
  data: Omit<School, "schoolId" | "schoolCode" | "createdAt" | "totalStudents" | "status">,
): Promise<string> {
  const schoolRef = doc(collection(db, SCHOOLS));
  const schoolCode = await uniqueSchoolCode();

  const school: School = {
    schoolId: schoolRef.id,
    schoolCode,
    createdAt: new Date().toISOString(),
    totalStudents: 0,
    status: "active",
    ...data,
  };

  await setDoc(schoolRef, school);
  return schoolRef.id;
}

export async function getSchoolByCode(code: string): Promise<School | null> {
  const normalized = code.trim().toUpperCase();
  const q = query(collection(db, SCHOOLS), where("schoolCode", "==", normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as School;
}

export async function getSchoolByAdmin(adminUid: string): Promise<School | null> {
  const q = query(collection(db, SCHOOLS), where("adminUid", "==", adminUid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as School;
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  const snap = await getDoc(doc(db, SCHOOLS, schoolId));
  if (!snap.exists()) return null;
  return snap.data() as School;
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

export async function isSchoolTeacher(uid: string, schoolId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, SCHOOL_TEACHERS, schoolId, TEACHERS_SUB, uid));
  if (!snap.exists()) return false;
  const data = snap.data();
  return data.status === "active";
}
