import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseApp";
import { logger } from "./logger";

/**
 * Phase 2: Compute host credibility score (0-100)
 * Based on:
 * - Ratio of events hosted vs cancelled
 * - On-time RSVP accept rates (placeholder for now)
 */
export async function computeHostScore(hostId: string): Promise<number> {
  try {
    // Get all outings hosted by this user
    const outingsQuery = query(
      collection(db, "outings"),
      where("hostId", "==", hostId)
    );
    const outingsSnap = await getDocs(outingsQuery);
    
    if (outingsSnap.empty) {
      // New host - return placeholder score
      return 75; // Default score for new hosts
    }
    
    const outings = outingsSnap.docs.map((doc) => doc.data());
    const totalOutings = outings.length;
    const cancelledOutings = outings.filter((o) => o.status === "cancelled").length;
    const activeOutings = outings.filter((o) => o.status === "active").length;
    const endedOutings = outings.filter((o) => o.status === "ended").length;
    
    // Calculate completion rate (ended + active vs cancelled)
    const completedOutings = activeOutings + endedOutings;
    const completionRate = totalOutings > 0 ? completedOutings / totalOutings : 1;
    
    // Base score from completion rate (0-80 points)
    let score = Math.round(completionRate * 80);
    
    // Bonus for having multiple successful events (up to +20 points)
    if (completedOutings >= 5) {
      score = Math.min(100, score + 20);
    } else if (completedOutings >= 3) {
      score = Math.min(100, score + 10);
    } else if (completedOutings >= 1) {
      score = Math.min(100, score + 5);
    }
    
    // Penalty for high cancellation rate
    if (cancelledOutings > 0 && cancelledOutings / totalOutings > 0.3) {
      score = Math.max(0, score - 20);
    }
    
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    logger.error("hostScore.compute.failed", { error, hostId });
    return 75; // Default score on error
  }
}



