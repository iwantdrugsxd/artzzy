import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseApp";
import { logger } from "./logger";
import { Profile } from "../types/profile";

export type IdConnectionRequest = {
  id?: string;
  fromUid: string;
  toUid: string;
  fromUserCode: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: any;
  decisionAt?: any;
  source: "user_id";
};

export type SendIdConnectionRequestResult = {
  status: "sent" | "error";
  error?: string;
};

export type FoundUserProfile = {
  uid: string;
  name: string;
  profile_photo_url?: string;
  city?: string;
};

const createNotification = async (
  userId: string,
  payload: Record<string, unknown>
) => {
  try {
    const notifRef = doc(collection(db, "users", userId, "notifications"));
    await setDoc(notifRef, {
      ...payload,
      read: false,
      createdAt: serverTimestamp(),
    });
    logger.info("idConnection.notification.setDoc.success", { userId, type: payload.type });
  } catch (error: any) {
    logger.error("idConnection.notification.failed", { 
      error, 
      userId, 
      payload,
      code: error?.code,
      message: error?.message 
    });
    // Re-throw so caller can handle it
    throw error;
  }
};

export const idConnectionStorage = {
  /**
   * Finds a user by their user_code
   * Returns minimal public profile for preview
   */
  async findUserByCode(userCode: string): Promise<{ success: boolean; user?: FoundUserProfile; error?: string }> {
    try {
      // Normalize user code (uppercase, trim)
      const normalizedCode = userCode.trim().toUpperCase();

      // Validate code format (only uppercase letters and numbers, 8-10 chars)
      if (!/^[A-Z0-9]+$/.test(normalizedCode) || normalizedCode.length < 8 || normalizedCode.length > 10) {
        return {
          success: false,
          error: "Invalid user ID format. Use uppercase letters and numbers only (8-10 characters).",
        };
      }

      // Find user by user_code
      const usersQuery = query(
        collection(db, "users"),
        where("user_code", "==", normalizedCode)
      );
      const usersSnap = await getDocs(usersQuery);

      if (usersSnap.empty) {
        return {
          success: false,
          error: "No user found with that ID.",
        };
      }

      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();

      return {
        success: true,
        user: {
          uid: userDoc.id,
          name: userData.name || "Unknown",
          profile_photo_url: userData.profile_photo_url || userData.primaryPhotoUrl || undefined,
          city: userData.city || undefined,
        },
      };
    } catch (error: any) {
      logger.error("idConnection.find.failed", { error, userCode });
      return {
        success: false,
        error: error?.message || "Failed to find user. Please try again.",
      };
    }
  },

  /**
   * Sends a connection request by user code
   * Finds the user by user_code, validates, and creates a request
   */
  async sendIdConnectionRequest({
    fromUid,
    toUid,
    fromProfile,
  }: {
    fromUid: string;
    toUid: string;
    fromProfile?: Profile | null;
  }): Promise<SendIdConnectionRequestResult> {
    const requestId = `${fromUid}_${toUid}`;
    
    try {
      logger.info("idConnection.request.attempt", { fromUid, toUid, requestId });

      // Prevent self-request
      if (toUid === fromUid) {
        logger.warn("idConnection.request.self", { fromUid });
        return {
          status: "error",
          error: "You can't add yourself.",
        };
      }

      const requestRef = doc(db, "idConnectionRequests", requestId);

      // Check for existing connection
      const connectionRef = doc(db, "users", fromUid, "connections", toUid);
      const connectionSnap = await getDoc(connectionRef);
      if (connectionSnap.exists()) {
        logger.warn("idConnection.request.already_connected", { fromUid, toUid });
        return {
          status: "error",
          error: "You're already connected with this user.",
        };
      }

      // Check for existing pending request
      const existingRequestSnap = await getDoc(requestRef);
      if (existingRequestSnap.exists()) {
        const existing = existingRequestSnap.data() as IdConnectionRequest;
        if (existing.status === "pending") {
          logger.warn("idConnection.request.already_pending", { requestId });
          return {
            status: "error",
            error: "Request already sent.",
          };
        }
      }

      // Create request
      try {
        await setDoc(requestRef, {
          fromUid,
          toUid,
          fromUserCode: fromProfile?.user_code || "",
          status: "pending",
          createdAt: serverTimestamp(),
          source: "user_id",
        });
        logger.info("idConnection.request.created", { requestId, fromUid, toUid });
      } catch (setDocError: any) {
        logger.error("idConnection.request.setDoc.failed", { 
          error: setDocError, 
          fromUid, 
          toUid, 
          requestId,
          code: setDocError?.code,
          message: setDocError?.message 
        });
        return {
          status: "error",
          error: setDocError?.code === "permission-denied" 
            ? "Permission denied. Please check Firestore security rules."
            : setDocError?.message || "Failed to create request. Please try again.",
        };
      }

      // Create notification for receiver
      const senderName = fromProfile?.name || "Someone";
      try {
        await createNotification(toUid, {
          type: "id_connection_request",
          fromUid,
          fromName: senderName,
          fromPhoto: fromProfile?.profile_photo_url || null,
          requestId,
          title: "New connection request",
          body: `${senderName} wants to connect`,
        });
        logger.info("idConnection.notification.created", { toUid, requestId });
      } catch (notifError: any) {
        logger.error("idConnection.notification.create.failed", { 
          error: notifError, 
          toUid, 
          requestId,
          code: notifError?.code,
          message: notifError?.message 
        });
        // Request was created but notification failed - return error so user knows
        // This is important because receiver won't see the request without notification
        return {
          status: "error",
          error: notifError?.code === "permission-denied"
            ? "Permission denied creating notification. Please check Firestore security rules."
            : notifError?.message || "Request created but failed to notify user. Please try again.",
        };
      }

      logger.info("idConnection.request.sent", { fromUid, toUid, requestId });

      return { status: "sent" };
    } catch (error: any) {
      logger.error("idConnection.send.failed", { 
        error, 
        fromUid, 
        toUid, 
        requestId,
        code: error?.code,
        message: error?.message,
        stack: error?.stack 
      });
      return {
        status: "error",
        error: error?.code === "permission-denied"
          ? "Permission denied. Please check Firestore security rules."
          : error?.message || "Failed to send request. Please try again.",
      };
    }
  },

  /**
   * Accepts an ID-based connection request
   * Adds both users to each other's connections and increments counters
   */
  async acceptIdConnectionRequest({
    requestId,
    toUid,
  }: {
    requestId: string;
    toUid: string;
  }): Promise<{ success: boolean; error?: string }> {
    const requestRef = doc(db, "idConnectionRequests", requestId);

    try {
      const requestSnap = await getDoc(requestRef);
      if (!requestSnap.exists()) {
        return { success: false, error: "Request not found" };
      }

      const request = requestSnap.data() as IdConnectionRequest;
      if (request.toUid !== toUid) {
        return { success: false, error: "Unauthorized" };
      }
      if (request.status !== "pending") {
        return { success: false, error: "Request already handled" };
      }

      const fromUid = request.fromUid;

      // Use transaction to ensure atomicity
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(requestRef);
        if (!snap.exists()) return;
        const data = snap.data() as IdConnectionRequest;
        if (data.status !== "pending") return;

        // Update request status
        tx.update(requestRef, {
          status: "accepted",
          decisionAt: serverTimestamp(),
        });

        // Add connection for both users
        const connectionA = doc(db, "users", fromUid, "connections", toUid);
        const connectionB = doc(db, "users", toUid, "connections", fromUid);

        tx.set(
          connectionA,
          {
            otherUid: toUid,
            sinceAt: serverTimestamp(),
            source: "user_id",
          },
          { merge: true }
        );

        tx.set(
          connectionB,
          {
            otherUid: fromUid,
            sinceAt: serverTimestamp(),
            source: "user_id",
          },
          { merge: true }
        );

        // Increment connection counters
        const userARef = doc(db, "users", fromUid);
        const userBRef = doc(db, "users", toUid);

        tx.update(userARef, {
          connectionsCount: increment(1),
        });

        tx.update(userBRef, {
          connectionsCount: increment(1),
        });
      });

      logger.info("idConnection.accepted", { requestId, fromUid, toUid });

      return { success: true };
    } catch (error: any) {
      logger.error("idConnection.accept.failed", { error, requestId, toUid });
      return {
        success: false,
        error: error?.message || "Failed to accept request",
      };
    }
  },

  /**
   * Rejects an ID-based connection request
   * Silently updates status - sender is NOT notified
   */
  async rejectIdConnectionRequest({
    requestId,
    toUid,
  }: {
    requestId: string;
    toUid: string;
  }): Promise<{ success: boolean; error?: string }> {
    const requestRef = doc(db, "idConnectionRequests", requestId);

    try {
      const snap = await getDoc(requestRef);
      if (!snap.exists()) {
        return { success: false, error: "Request not found" };
      }

      const request = snap.data() as IdConnectionRequest;
      if (request.toUid !== toUid || request.status !== "pending") {
        return { success: false, error: "Invalid request" };
      }

      await updateDoc(requestRef, {
        status: "rejected",
        decisionAt: serverTimestamp(),
      });

      // Do NOT notify sender - silent rejection to prevent spam

      logger.info("idConnection.rejected", { requestId, toUid });

      return { success: true };
    } catch (error: any) {
      logger.error("idConnection.reject.failed", { error, requestId, toUid });
      return {
        success: false,
        error: error?.message || "Failed to reject request",
      };
    }
  },
};
