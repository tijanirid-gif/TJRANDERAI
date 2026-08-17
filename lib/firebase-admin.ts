import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const serviceAccount = require("../firebase-service-account.json");

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        databaseURL:
          "https://tj-renderai-default-rtdb.europe-west1.firebasedatabase.app",
      });

export const adminDb = getDatabase(adminApp);

export default adminApp;