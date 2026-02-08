/**
 * Manual backfill script for existing users without user_code
 * 
 * Usage:
 *   ts-node scripts/backfillUserCodes.ts
 * 
 * This script:
 * 1. Loads all users from Firestore
 * 2. Identifies users missing user_code
 * 3. Generates unique codes for each
 * 4. Updates user documents
 * 
 * WARNING: This script modifies production data. Run with caution.
 * It's safe to run multiple times (idempotent).
 */

import * as admin from "firebase-admin";
import * as path from "path";

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;

/**
 * Generates a random user code (uppercase letters and numbers)
 */
const generateUserCode = (): string => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
};

/**
 * Checks if a user code is already in use
 */
const isUserCodeTaken = async (code: string): Promise<boolean> => {
  const snap = await db.collection("users").where("user_code", "==", code).limit(1).get();
  return !snap.empty;
};

/**
 * Generates a unique user code
 */
const ensureUniqueUserCode = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    const code = generateUserCode();
    const isTaken = await isUserCodeTaken(code);

    if (!isTaken) {
      return code;
    }

    attempts++;
    console.log(`  Collision detected, retrying... (attempt ${attempts})`);
  }

  throw new Error("Failed to generate unique user code after multiple attempts");
};

/**
 * Main backfill function
 */
const backfillUserCodes = async () => {
  console.log("Starting user_code backfill...\n");

  try {
    // Get all users
    const usersSnap = await db.collection("users").get();
    console.log(`Found ${usersSnap.size} total users`);

    // Filter users without user_code
    const usersWithoutCode: admin.firestore.DocumentSnapshot[] = [];
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (!data.user_code) {
        usersWithoutCode.push(doc);
      }
    });

    console.log(`Found ${usersWithoutCode.length} users without user_code\n`);

    if (usersWithoutCode.length === 0) {
      console.log("All users already have user_code. Nothing to do.");
      return;
    }

    // Process in batches to avoid overwhelming Firestore
    const BATCH_SIZE = 10;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < usersWithoutCode.length; i += BATCH_SIZE) {
      const batch = usersWithoutCode.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (userDoc) => {
          try {
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            // Double-check (in case it was updated by another process)
            if (userData.user_code) {
              console.log(`  User ${userId} already has code, skipping`);
              return;
            }

            const userCode = await ensureUniqueUserCode();
            await userDoc.ref.update({ user_code: userCode });
            
            processed++;
            console.log(`  ✓ ${userId}: ${userCode} (${processed}/${usersWithoutCode.length})`);
          } catch (error: any) {
            errors++;
            console.error(`  ✗ ${userDoc.id}: ${error.message}`);
          }
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < usersWithoutCode.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Errors: ${errors}`);
  } catch (error: any) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
};

// Run the backfill
backfillUserCodes()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
