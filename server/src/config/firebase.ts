import admin from 'firebase-admin';

export const initializeFirebase = (): admin.app.App => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountRaw && serviceAccountRaw !== '{}') {
    try {
      const serviceAccount = JSON.parse(serviceAccountRaw);
      if (serviceAccount.private_key) {
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
    } catch (error) {
      console.warn(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to default credentials:',
        error
      );
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
};

export default admin;
