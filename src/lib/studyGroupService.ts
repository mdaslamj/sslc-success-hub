import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/config";

export interface StudyGroup {
  groupId: string;
  createdBy: string;
  members: string[];
  /**
   * @deprecated PII — no longer persisted. Field kept optional only so older
   * documents still type-check when read. New writes never include emails.
   */
  memberEmails?: string[];
  subscriptionId?: string;
  plan: "group_599";
  status: "active" | "inactive" | "pending";
  createdAt: string;
  maxMembers: number;
}

export async function createStudyGroup(
  adminUserId: string,
  adminEmail: string,
): Promise<string> {
  const groupId = `group_${adminUserId}_${Date.now()}`;
  // SECURITY: do not store member emails on the group doc — any signed-in
  // user with the groupId could otherwise read other members' PII.
  void adminEmail;
  const group: StudyGroup = {
    groupId,
    createdBy: adminUserId,
    members: [adminUserId],
    plan: "group_599",
    status: "pending",
    createdAt: new Date().toISOString(),
    maxMembers: 5,
  };

  await setDoc(doc(db, "study_groups", groupId), group);
  await setDoc(
    doc(db, "users", adminUserId),
    { groupId, plan: "group_599" },
    { merge: true },
  );

  return groupId;
}

export function generateInviteLink(groupId: string): string {
  const base = window.location.origin;
  return `${base}/join-group?id=${groupId}`;
}

export async function getStudyGroupById(groupId: string): Promise<StudyGroup | null> {
  const snap = await getDoc(doc(db, "study_groups", groupId));
  if (!snap.exists()) return null;
  return snap.data() as StudyGroup;
}

export async function joinStudyGroup(
  groupId: string,
  userId: string,
  userEmail: string,
): Promise<{ success: boolean; error?: string }> {
  void userEmail;
  const snap = await getDoc(doc(db, "study_groups", groupId));

  if (!snap.exists()) {
    return { success: false, error: "Group not found" };
  }

  const group = snap.data() as StudyGroup;

  if (group.members.length >= group.maxMembers) {
    return {
      success: false,
      error: "Group is full (5 students maximum)",
    };
  }

  if (group.members.includes(userId)) {
    return { success: false, error: "Already in group" };
  }

  if (group.status !== "active") {
    return {
      success: false,
      error: "Group subscription is not active yet",
    };
  }

  await updateDoc(doc(db, "study_groups", groupId), {
    members: arrayUnion(userId),
  });

  await setDoc(
    doc(db, "users", userId),
    { groupId, plan: "group_599" },
    { merge: true },
  );

  return { success: true };
}

export async function leaveStudyGroup(
  groupId: string,
  userId: string,
  userEmail: string,
): Promise<{ success: boolean; error?: string }> {
  void userEmail;
  const snap = await getDoc(doc(db, "study_groups", groupId));
  if (!snap.exists()) {
    return { success: false, error: "Group not found" };
  }

  const group = snap.data() as StudyGroup;
  if (!group.members.includes(userId)) {
    return { success: false, error: "Not a member of this group" };
  }

  if (group.createdBy === userId) {
    return {
      success: false,
      error: "Group admin cannot leave. Transfer admin or delete the group first.",
    };
  }

  await updateDoc(doc(db, "study_groups", groupId), {
    members: arrayRemove(userId),
  });

  await setDoc(
    doc(db, "users", userId),
    { groupId: null, plan: null },
    { merge: true },
  );

  return { success: true };
}

/** Dev stub until Razorpay merchant account is active. */
export async function activateGroupSubscription(groupId: string): Promise<void> {
  await updateDoc(doc(db, "study_groups", groupId), {
    status: "active",
    subscriptionId: "pending_razorpay",
  });
}

export async function getUserGroup(userId: string): Promise<StudyGroup | null> {
  const q = query(
    collection(db, "study_groups"),
    where("members", "array-contains", userId),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as StudyGroup;
}

export async function hasActiveAccess(userId: string): Promise<boolean> {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) return false;

  const user = userSnap.data() as {
    plan?: string;
    subscriptionStatus?: string;
  };

  if (user.plan === "premium" && user.subscriptionStatus === "active") {
    return true;
  }

  const group = await getUserGroup(userId);
  if (group?.status === "active") return true;

  return false;
}
