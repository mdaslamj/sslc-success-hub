const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onSchoolAccountCreated = functions.auth.user().onCreate(async (user) => {
  if (!user.email?.endsWith("@aura.school")) return;

  const schoolCode = user.email.split("@")[0].toUpperCase();

  const schools = await admin
    .firestore()
    .collection("schools")
    .where("schoolCode", "==", schoolCode)
    .limit(1)
    .get();

  if (schools.empty) return;

  const school = schools.docs[0];
  const now = Date.now();

  await admin.auth().setCustomUserClaims(user.uid, {
    role: "school",
    schoolId: school.id,
    schoolCode,
  });

  await admin.firestore().doc(`userProfiles/${user.uid}`).set(
    {
      uid: user.uid,
      email: user.email,
      displayName: school.data().name ?? schoolCode,
      studentName: "",
      classLevel: "10",
      targetScore: 90,
      preferredLanguage: "en",
      weakSubjects: [],
      studyGoals: [],
      role: "school",
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
});
