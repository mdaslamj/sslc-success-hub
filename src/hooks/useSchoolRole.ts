import { useEffect, useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";

export function useSchoolRole() {
  const auth = useAuthOptional();
  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [tokenSchoolId, setTokenSchoolId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.user) {
      setTokenRole(null);
      setTokenSchoolId(null);
      return;
    }
    void auth.user.getIdTokenResult().then((result) => {
      setTokenRole(typeof result.claims.role === "string" ? result.claims.role : null);
      setTokenSchoolId(
        typeof result.claims.schoolId === "string" ? result.claims.schoolId : null,
      );
    });
  }, [auth?.user]);

  const profile = auth?.profile;
  const isSchool = profile?.role === "school" || tokenRole === "school";
  const schoolId = profile?.schoolId ?? tokenSchoolId ?? undefined;
  const schoolCode = profile?.schoolCode;
  const schoolName = profile?.schoolName;
  /** Student account linked to a school (not the shared school staff login). */
  const isSchoolStudent = !isSchool && Boolean(schoolId && schoolName);

  return {
    isSchool,
    isSchoolStudent,
    schoolId,
    schoolCode,
    schoolName,
    tokenRole,
  };
}
