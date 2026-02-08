/**
 * Backfill script to update connectionsCount for all users
 * 
 * Usage:
 *   ts-node scripts/backfillConnectionsCount.ts
 * 
 * This script:
 * 1. Loads all users from Firestore
 * 2. For each user, counts actual connections in users/{uid}/connections
 * 3. Updates connectionsCount to match the actual count
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

/**
 * Main backfill function
 */
const backfillConnectionsCount = async () => {
  console.log("Starting connectionsCount backfill...\n");

  try {
    // Get all users
    const usersSnap = await db.collection("users").get();
    console.log(`Found ${usersSnap.size} total users\n`);

    if (usersSnap.size === 0) {
      console.log("No users found. Nothing to do.");
      return;
    }

    // Process in batches to avoid overwhelming Firestore
    const BATCH_SIZE = 10;
    let processed = 0;
    let updated = 0;
    let errors = 0;

    const users = usersSnap.docs;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (userDoc) => {
          try {
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            // Count actual connections
            const connectionsSnap = await db
              .collection("users")
              .doc(userId)
              .collection("connections")
              .get();
            
            const actualCount = connectionsSnap.size;
            const currentCount = userData.connectionsCount || 0;

            // Only update if count differs
            if (actualCount !== currentCount) {
              await userDoc.ref.update({
                connectionsCount: actualCount,
              });
              
              updated++;
              console.log(
                `  ✓ ${userId}: ${currentCount} → ${actualCount} connections (${updated}/${users.length})`
              );
            } else {
              processed++;
              if (processed % 50 === 0) {
                console.log(`  ... processed ${processed} users (no updates needed)`);
              }
            }
          } catch (error: any) {
            errors++;
            console.error(`  ✗ ${userDoc.id}: ${error.message}`);
          }
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < users.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`\nBackfill complete!`);
    console.log(`  Total users: ${users.length}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Already correct: ${processed}`);
    console.log(`  Errors: ${errors}`);
  } catch (error: any) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
};

// Run the backfill
backfillConnectionsCount()
  .then(() => {
    console.log("\nScript completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
