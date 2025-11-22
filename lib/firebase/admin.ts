import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
let adminApp: App;

// CRITICAL FIX: Matching the environment variable names exactly from .env.local
// We must use the FIREBASE_ADMIN_ prefix as defined in .env.local
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

// --- CRITICAL VALIDATION ---
if (!projectId || !clientEmail || !privateKey) {
  const missingVars = [];
  if (!projectId) missingVars.push('FIREBASE_ADMIN_PROJECT_ID');
  if (!clientEmail) missingVars.push('FIREBASE_ADMIN_CLIENT_EMAIL');
  if (!privateKey) missingVars.push('FIREBASE_ADMIN_PRIVATE_KEY');
  
  console.error("ADMIN SDK INIT ERROR: The following environment variables are missing or empty:", missingVars.join(', '));
  
  // This error will now display the exact missing variable name if it fails
  throw new Error(`Admin SDK initialization failed. Missing critical environment variables: ${missingVars.join(', ')}. Please check your .env.local file.`);
}
// ---------------------------


if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert({
      projectId: projectId,
      clientEmail: clientEmail,
      // This regex replaces escaped newlines (\n) with actual newlines (\n)
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
  console.log('Firebase Admin SDK initialized successfully.');
} else {
  adminApp = getApps()[0];
  console.log('Firebase Admin SDK reused existing instance.');
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
