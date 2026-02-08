/**
 * Quick script to list existing user codes from Firestore
 * 
 * Usage:
 *   npx ts-node --esm scripts/listUserCodes.ts
 *   OR
 *   node --loader ts-node/esm scripts/listUserCodes.ts
 * 
 * This script lists users with their user_code for testing purposes.
 */

import * as admin from "firebase-admin";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createRequire } from "module";
import { readFileSync } from "fs";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/**
 * List users with user_code
 */
const listUserCodes = async () => {
  console.log("Fetching users with user_code...\n");

  try {
    // Get all users (limit to first 50 for performance)
    const usersSnap = await db.collection("users").limit(50).get();
    console.log(`Found ${usersSnap.size} users (showing first 50)\n`);

    const usersWithCode: Array<{ uid: string; name: string; user_code: string; email?: string }> = [];

    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.user_code) {
        usersWithCode.push({
          uid: doc.id,
          name: data.name || "Unknown",
          user_code: data.user_code,
          email: data.email,
        });
      }
    });

    if (usersWithCode.length === 0) {
      console.log("No users found with user_code.");
      console.log("You may need to run the backfill script first:");
      console.log("  ts-node scripts/backfillUserCodes.ts\n");
      return;
    }

    console.log(`Found ${usersWithCode.length} users with user_code:\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("User Code    | Name                    | UID");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    usersWithCode.slice(0, 10).forEach((user) => {
      const code = user.user_code.padEnd(12);
      const name = (user.name || "Unknown").substring(0, 22).padEnd(22);
      const uid = user.uid.substring(0, 20);
      console.log(`${code} | ${name} | ${uid}`);
    });

    if (usersWithCode.length > 10) {
      console.log(`\n... and ${usersWithCode.length - 10} more users`);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n💡 Test User Codes (copy one of these):\n");
    usersWithCode.slice(0, 5).forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.user_code} - ${user.name}`);
    });
    console.log("\n");

  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

// Run the script
listUserCodes()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
