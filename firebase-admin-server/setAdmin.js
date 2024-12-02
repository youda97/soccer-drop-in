const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const setAdminClaim = async (uid) => {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Successfully set admin claim for user: ${uid}`);
  } catch (error) {
    console.error('Error setting admin claim:', error);
  }
};

// Replace 'USER_UID' with your actual user's UID
const userUid = '9rYwiOOysXQkXEJaRt1Q0tQpZ043';
setAdminClaim(userUid);
