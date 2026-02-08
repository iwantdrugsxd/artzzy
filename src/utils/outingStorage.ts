import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  increment,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseApp";
import { logger } from "./logger";

export type OutingRequestStatus = "pending" | "approved" | "declined" | "cancelled";

export type OutingRequest = {
  outingId: string;
  userId: string;
  hostId?: string;
  status: OutingRequestStatus;
  source?: "curated_request" | "fast_join"; // Track how the request was created
  updatedAt: any;
  createdAt?: any;
  // Optional metadata
  userName?: string;
  userPhotoUrl?: string;
  userCity?: string;
  vibeMatch?: number;
  message?: string;
};

export const outingStorage = {
  async getRequestForUser(outingId: string, userId: string) {
    const ref = doc(db, "outingRequests", `${outingId}_${userId}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as OutingRequest;
  },
  async createRequest(
    outingId: string,
    userId: string,
    hostId: string,
    meta: Record<string, unknown>
  ) {
    const requestRef = doc(db, "outingRequests", `${outingId}_${userId}`);
    const outingRef = doc(db, "outings", outingId);
    
    // Get outing title for notification
    let outingTitle = "an outing";
    try {
      const outingSnap = await getDoc(outingRef);
      if (outingSnap.exists()) {
        outingTitle = outingSnap.data().title || outingTitle;
      }
    } catch (error) {
      logger.error("outing.title.fetch.failed", { error });
    }
    
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(requestRef);
      if (existing.exists()) return;
      
      tx.set(requestRef, {
        outingId,
        userId,
        hostId,
        status: "pending",
        source: "curated_request",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...meta,
      });
      tx.update(outingRef, { pendingCount: increment(1), updatedAt: serverTimestamp() });
    });
    
    logger.info("outing.request.sent", { outingId, userId });
    
    // Create notification for host (outside transaction for better error handling)
    try {
      const notificationRef = doc(collection(db, "users", hostId, "notifications"));
      await setDoc(notificationRef, {
        type: "join_request",
        title: "New join request",
        body: `${meta.userName || "Someone"} wants to join "${outingTitle}"`,
        outingId,
        requesterId: userId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      // Notification failure shouldn't block request
      logger.error("notification.create.failed", { error, hostId, outingId });
    }
  },
  async approveRequest(
    outingId: string,
    userId: string,
    hostId: string,
    outingMeta: Record<string, unknown>
  ) {
    const requestRef = doc(db, "outingRequests", `${outingId}_${userId}`);
    const outingRef = doc(db, "outings", outingId);
    const memberRef = doc(db, "outings", outingId, "members", userId);
    const userIndexRef = doc(db, "users", userId, "activeOutings", outingId);
    const messagesRef = doc(collection(db, "outings", outingId, "messages"));
    
    // Get user and outing details for notifications and system message
    let userName = "Guest";
    let outingTitle = "an outing";
    try {
      const [requestSnap, outingSnap, userSnap] = await Promise.all([
        getDoc(requestRef),
        getDoc(outingRef),
        getDoc(doc(db, "users", userId)),
      ]);
      
      if (requestSnap.exists()) {
        userName = requestSnap.data().userName || userName;
      }
      if (outingSnap.exists()) {
        outingTitle = outingSnap.data().title || outingTitle;
      }
    } catch (error) {
      logger.error("approve.meta.fetch.failed", { error });
    }
    
    await runTransaction(db, async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists()) return;
      
      // Sanitize outingMeta: remove undefined values and only include safe fields
      // Firestore doesn't allow undefined, and Timestamp objects from reads might not be directly writable
      // Only include essential string fields that are safe to write
      const safeFields = ["title", "coverImageUrl", "area"] as const;
      const sanitizedMeta: Record<string, unknown> = {};
      
      for (const [k, v] of Object.entries(outingMeta)) {
        // Remove undefined (Firestore rejects undefined)
        if (v === undefined) {
          logger.warn("outingStorage.approve.sanitizing.undefined", { field: k });
          continue;
        }
        
        // Only include safe string fields (title, coverImageUrl, area)
        // Exclude dateTime as Timestamp objects from reads might not be directly writable
        if (safeFields.includes(k as typeof safeFields[number])) {
          sanitizedMeta[k] = v; // Safe to include (string or null)
        } else if (k === "dateTime") {
          // Skip dateTime - it's a Timestamp and might cause issues when writing
          logger.info("outingStorage.approve.sanitizing.skippingDateTime", { 
            reason: "Timestamp from read may not be directly writable" 
          });
        } else if (k !== "outingId" && k !== "hostId") {
          // Log unexpected fields but don't include them
          logger.warn("outingStorage.approve.sanitizing.unexpectedField", { field: k, type: typeof v });
        }
      }
      
      // Validate required fields
      if (!outingId || typeof outingId !== "string") {
        throw new Error("Invalid outingId");
      }
      if (!hostId || typeof hostId !== "string") {
        throw new Error("Invalid hostId");
      }
      
      // Build final payload matching the structure used in CreateOutingScreen
      // Required fields: outingId, role, status
      // Optional fields: title, coverImageUrl, area, hostId
      const finalPayload: Record<string, unknown> = {
        outingId: String(outingId), // Required: ensure it's a string
        role: "member", // Required: role for the user being approved
        status: "active", // Required: status of the outing
        hostId: String(hostId), // Optional but useful: host ID
      };
      
      // Only add title if it's a valid non-empty string
      if (sanitizedMeta.title && typeof sanitizedMeta.title === "string" && sanitizedMeta.title.trim()) {
        finalPayload.title = String(sanitizedMeta.title).trim();
      }
      
      // Only add coverImageUrl if it's a valid string (can be empty, but must be string)
      if (sanitizedMeta.coverImageUrl !== undefined && sanitizedMeta.coverImageUrl !== null) {
        finalPayload.coverImageUrl = String(sanitizedMeta.coverImageUrl);
      }
      
      // Only add area if it's a valid string
      if (sanitizedMeta.area !== undefined && sanitizedMeta.area !== null) {
        finalPayload.area = String(sanitizedMeta.area);
      }
      
      // Validate string lengths (Firestore has limits)
      const MAX_STRING_LENGTH = 1048487; // Firestore max string length
      for (const [k, v] of Object.entries(finalPayload)) {
        if (typeof v === "string" && v.length > MAX_STRING_LENGTH) {
          throw new Error(`Field ${k} exceeds maximum length`);
        }
      }
      
      logger.info("outingStorage.approve.sanitized", { 
        originalKeys: Object.keys(outingMeta),
        sanitizedKeys: Object.keys(sanitizedMeta),
        finalKeys: Object.keys(finalPayload),
        finalPayloadValues: Object.fromEntries(
          Object.entries(finalPayload).map(([k, v]) => [
            k, 
            v === null ? "null" : typeof v === "string" ? `${String(v).substring(0, 50)}...` : typeof v
          ])
        ),
        payloadStringLengths: Object.fromEntries(
          Object.entries(finalPayload)
            .filter(([, v]) => typeof v === "string")
            .map(([k, v]) => [k, String(v).length])
        )
      });
      
      // Check if document exists and log existing data for debugging
      const existingSnap = await tx.get(userIndexRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        logger.info("outingStorage.approve.tx.userIndexRef.exists", { 
          existingKeys: Object.keys(existingData || {}),
          existingValues: Object.fromEntries(
            Object.entries(existingData || {}).map(([k, v]) => [
              k,
              v === null ? "null" : typeof v === "string" ? `${String(v).substring(0, 30)}...` : typeof v
            ])
          )
        });
      }
      
      // Firestore transactions require all reads before any writes.
      const outingData = await tx.get(outingRef);
      if (!outingData.exists()) {
        throw new Error("Outing not found");
      }
      
      const outingDocData = outingData.data();
      const currentApproved = typeof outingDocData?.approvedCount === "number" ? outingDocData.approvedCount : 0;
      const currentPending = typeof outingDocData?.pendingCount === "number" ? outingDocData.pendingCount : 0;
      const maxGuests = typeof outingDocData?.maxGuests === "number" ? outingDocData.maxGuests : 0;

      // Use setDoc without merge to avoid conflicts with existing invalid data
      // This ensures we write exactly what we want, overwriting any existing data
      tx.set(userIndexRef, finalPayload);
      
      logger.info("outingStorage.approve.tx.userIndexRef.set", { 
        path: userIndexRef.path,
        payloadKeys: Object.keys(finalPayload)
      });
      
      logger.info("outingStorage.approve.tx.requestRef.update", { path: requestRef.path });
      tx.update(requestRef, { status: "approved", updatedAt: serverTimestamp() });
      
      logger.info("outingStorage.approve.tx.memberRef.set", { path: memberRef.path });
      tx.set(memberRef, { role: "member", joinedAt: serverTimestamp() }, { merge: true });
      
      // Validate that we can safely decrement pendingCount
      if (currentPending < 1) {
        logger.warn("outingStorage.approve.pendingCount.invalid", { currentPending });
        // Don't throw, just log - the request might have been processed already
      }
      
      // Build single update object to avoid multiple writes to same document
      // Firestore doesn't allow multiple writes to the same doc in one transaction
      // Only decrement pendingCount if it's > 0 to avoid negative values
      const outingUpdate: Record<string, unknown> = {
        approvedCount: increment(1),
        updatedAt: serverTimestamp(),
      };
      
      // Only decrement pendingCount if it's positive (avoid negative values)
      if (currentPending > 0) {
        outingUpdate.pendingCount = increment(-1);
      } else {
        // Set to 0 explicitly if it's already 0 or negative
        outingUpdate.pendingCount = 0;
      }
      
      // Phase 2: Auto-close at capacity (only if maxGuests > 0 to avoid false positives)
      if (maxGuests > 0 && currentApproved + 1 >= maxGuests) {
        outingUpdate.status = "full";
      }
      
      logger.info("outingStorage.approve.tx.outingRef.update", {
        currentApproved,
        currentPending,
        maxGuests,
        willSetFull: maxGuests > 0 && currentApproved + 1 >= maxGuests,
        updateKeys: Object.keys(outingUpdate)
      });
      
      // Single update call to avoid invalid-argument error
      tx.update(outingRef, outingUpdate);
      
      logger.info("outingStorage.approve.tx.messagesRef.set", { path: messagesRef.path });
      // Add system message
      tx.set(messagesRef, {
        type: "system",
        text: `${userName} joined the outing`,
        createdAt: serverTimestamp(),
      });
    });
    
    logger.info("outing.request.approved", { outingId, userId });
    
    // Create notification for requester (outside transaction)
    try {
      const notificationRef = doc(collection(db, "users", userId, "notifications"));
      await setDoc(notificationRef, {
        type: "request_approved",
        title: "You're in 🎉",
        body: `You've been approved for "${outingTitle}"`,
        outingId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("approval.notification.failed", { error });
    }
  },
  async declineRequest(outingId: string, userId: string) {
    const requestRef = doc(db, "outingRequests", `${outingId}_${userId}`);
    const outingRef = doc(db, "outings", outingId);
    
    // Get outing title for notification
    let outingTitle = "an outing";
    try {
      const outingSnap = await getDoc(outingRef);
      if (outingSnap.exists()) {
        outingTitle = outingSnap.data().title || outingTitle;
      }
    } catch (error) {
      logger.error("decline.outing.fetch.failed", { error });
    }
    
    await runTransaction(db, async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists()) return;
      tx.update(requestRef, { status: "declined", updatedAt: serverTimestamp() });
      tx.update(outingRef, { pendingCount: increment(-1), updatedAt: serverTimestamp() });
    });
    
    logger.info("outing.request.declined", { outingId, userId });
    
    // Create notification for requester (outside transaction)
    try {
      const notificationRef = doc(collection(db, "users", userId, "notifications"));
      await setDoc(notificationRef, {
        type: "request_declined",
        title: "Request declined",
        body: `Your request for "${outingTitle}" was declined`,
        outingId,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("decline.notification.failed", { error });
    }
  },
  /**
   * Fast join: Auto-approve and add member immediately
   * Only works for fast-mode events
   */
  async fastJoin(
    outingId: string,
    userId: string,
    hostId: string,
    meta: Record<string, unknown>
  ) {
    const requestRef = doc(db, "outingRequests", `${outingId}_${userId}`);
    const outingRef = doc(db, "outings", outingId);
    const memberRef = doc(db, "outings", outingId, "members", userId);
    const userIndexRef = doc(db, "users", userId, "activeOutings", outingId);
    const messagesRef = doc(collection(db, "outings", outingId, "messages"));
    
    // Get outing details
    let outingTitle = "an outing";
    let userName = meta.userName as string || "Guest";
    let maxGuests = 0;
    let approvedCount = 0;
    
    try {
      const outingSnap = await getDoc(outingRef);
      if (outingSnap.exists()) {
        const data = outingSnap.data();
        outingTitle = data.title || outingTitle;
        maxGuests = data.maxGuests || 0;
        approvedCount = data.approvedCount || 0;
      }
    } catch (error) {
      logger.error("fastJoin.outing.fetch.failed", { error });
    }
    
    await runTransaction(db, async (tx) => {
      // Check if already a member
      const existingMember = await tx.get(memberRef);
      if (existingMember.exists()) {
        throw new Error("Already a member");
      }
      
      // Check if event is full
      const outingSnap = await tx.get(outingRef);
      if (!outingSnap.exists()) {
        throw new Error("Outing not found");
      }
      
      const outingData = outingSnap.data();
      const currentCount = outingData.approvedCount || 0;
      const max = outingData.maxGuests || 0;
      
      if (currentCount >= max) {
        throw new Error("Event is full");
      }
      
      // Check if event mode is fast
      if (outingData.eventMode !== "fast") {
        throw new Error("Event is not in fast mode");
      }
      
      // Create request with approved status
      tx.set(requestRef, {
        outingId,
        userId,
        hostId,
        status: "approved",
        source: "fast_join",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...meta,
      });
      
      // Create member doc
      tx.set(memberRef, {
        role: "member",
        joinedAt: serverTimestamp(),
      });
      
      // Update user's active outings index
      tx.set(userIndexRef, {
        outingId,
        hostId,
        title: outingTitle,
        coverImageUrl: outingData.coverImageUrl || null,
        dateTime: outingData.dateTime || null,
        area: outingData.area || null,
      }, { merge: true });
      
      // Build single update object to avoid multiple writes to same document
      // Firestore doesn't allow multiple writes to the same doc in one transaction
      const outingUpdate: Record<string, unknown> = {
        approvedCount: increment(1),
        updatedAt: serverTimestamp(),
      };
      
      // Phase 2: Auto-close at capacity (only if max > 0 to avoid false positives)
      if (max > 0 && currentCount + 1 >= max) {
        outingUpdate.status = "full";
      }
      
      // Single update call to avoid invalid-argument error
      tx.update(outingRef, outingUpdate);
      
      // Add system message
      tx.set(messagesRef, {
        type: "system",
        text: `${userName} joined the outing`,
        createdAt: serverTimestamp(),
      });
    });
    
    // Create notification for host only if near full (spike mode)
    try {
      const outingSnap = await getDoc(outingRef);
      if (outingSnap.exists()) {
        const data = outingSnap.data();
        const spotsLeft = (data.maxGuests || 0) - (data.approvedCount || 0);
        
        // Notify host when event becomes near full (spotsLeft <= 3)
        if (spotsLeft <= 3) {
          const notificationRef = doc(collection(db, "users", hostId, "notifications"));
          await setDoc(notificationRef, {
            type: "system",
            title: spotsLeft === 0 ? "Event Full" : "Event Almost Full",
            body: spotsLeft === 0 
              ? `"${outingTitle}" is now full!`
              : `"${outingTitle}" has ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`,
            outingId,
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      // Notification failure shouldn't block join
      logger.error("fastJoin.notification.failed", { error });
    }
  },

  /**
   * Add a system message to the chat
   */
  async addSystemMessage(outingId: string, text: string) {
    try {
      await addDoc(collection(db, "outings", outingId, "messages"), {
        type: "system",
        text,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("system.message.add.failed", { error, outingId, text });
      throw error;
    }
  },

  /**
   * Set RSVP status for a member (curated events)
   */
  async setRSVP(outingId: string, userId: string, rsvp: "going" | "maybe" | "no") {
    const memberRef = doc(db, "outings", outingId, "members", userId);
    try {
      await updateDoc(memberRef, {
        rsvp,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("rsvp.set.failed", { error, outingId, userId, rsvp });
      throw error;
    }
  },

  /**
   * Member leaves the outing
   */
  async leaveOuting(outingId: string, userId: string) {
    const memberRef = doc(db, "outings", outingId, "members", userId);
    const userIndexRef = doc(db, "users", userId, "activeOutings", outingId);
    const outingRef = doc(db, "outings", outingId);

    // Phase 2: Check if member before transaction (for waitlist promotion)
    let wasMember = false;
    try {
      const memberSnapBefore = await getDoc(memberRef);
      wasMember = memberSnapBefore.exists() && memberSnapBefore.data().role === "member";
    } catch (error) {
      logger.error("leave.member.check.failed", { error });
    }

    try {
      await runTransaction(db, async (tx) => {
        // Check if member exists
        const memberSnap = await tx.get(memberRef);
        if (!memberSnap.exists()) {
          throw new Error("Not a member");
        }

        const memberData = memberSnap.data();
        const outingData = await tx.get(outingRef);
        const currentApproved = outingData.data()?.approvedCount || 0;
        const currentStatus = outingData.data()?.status || "active";
        
        // Only decrement if they were approved (not pending)
        if (memberData.role === "member") {
          // Build single update object to avoid multiple writes to same document
          const outingUpdate: Record<string, unknown> = {
            approvedCount: increment(-1),
            updatedAt: serverTimestamp(),
          };
          
          // Phase 2: Reopen if was full and now has space
          if (currentStatus === "full" && currentApproved > 0) {
            outingUpdate.status = "active";
          }
          
          // Single update call to avoid invalid-argument error
          tx.update(outingRef, outingUpdate);
        }

        // Delete member doc and user index
        tx.delete(memberRef);
        tx.delete(userIndexRef);
      });
      
      // Phase 2: Promote from waitlist after member leaves (outside transaction)
      if (wasMember) {
        await outingStorage.promoteFromWaitlist(outingId);
      }
    } catch (error) {
      logger.error("leave.outing.failed", { error, outingId, userId });
      throw error;
    }
  },

  /**
   * Host removes a member from the outing
   */
  async removeMember(outingId: string, targetUserId: string, hostId: string) {
    const memberRef = doc(db, "outings", outingId, "members", targetUserId);
    const userIndexRef = doc(db, "users", targetUserId, "activeOutings", outingId);
    const outingRef = doc(db, "outings", outingId);
    const messagesRef = doc(collection(db, "outings", outingId, "messages"));

    // Get user name for system message
    let userName = "A member";
    try {
      const userSnap = await getDoc(doc(db, "users", targetUserId));
      if (userSnap.exists()) {
        userName = userSnap.data().name || userName;
      }
    } catch (error) {
      logger.error("remove.member.user.fetch.failed", { error });
    }

    try {
      await runTransaction(db, async (tx) => {
        // Verify host
        const outingSnap = await tx.get(outingRef);
        if (!outingSnap.exists()) {
          throw new Error("Outing not found");
        }
        if (outingSnap.data().hostId !== hostId) {
          throw new Error("Only host can remove members");
        }

        // Check if member exists
        const memberSnap = await tx.get(memberRef);
        if (!memberSnap.exists()) {
          throw new Error("User is not a member");
        }

        const memberData = memberSnap.data();
        const outingData = await tx.get(outingRef);
        const currentApproved = outingData.data()?.approvedCount || 0;
        const currentStatus = outingData.data()?.status || "active";
        
        // Decrement count if they were approved
        if (memberData.role === "member") {
          // Build single update object to avoid multiple writes to same document
          const outingUpdate: Record<string, unknown> = {
            approvedCount: increment(-1),
            updatedAt: serverTimestamp(),
          };
          
          // Phase 2: Reopen if was full and now has space
          if (currentStatus === "full" && currentApproved > 0) {
            outingUpdate.status = "active";
          }
          
          // Single update call to avoid invalid-argument error
          tx.update(outingRef, outingUpdate);
        }

        // Delete member doc and user index
        tx.delete(memberRef);
        tx.delete(userIndexRef);

        // Add system message
        tx.set(messagesRef, {
          type: "system",
          text: `${userName} was removed by the host`,
          createdAt: serverTimestamp(),
        });
      });
      
      // Phase 2: Promote from waitlist after member is removed
      const memberSnapBefore = await getDoc(memberRef);
      const wasMember = memberSnapBefore.exists() && memberSnapBefore.data().role === "member";
      if (wasMember) {
        await outingStorage.promoteFromWaitlist(outingId);
      }
    } catch (error) {
      logger.error("remove.member.failed", { error, outingId, targetUserId, hostId });
      throw error;
    }
  },

  /**
   * Host manually reveals location
   */
  async revealLocation(outingId: string, hostId: string) {
    const outingRef = doc(db, "outings", outingId);
    const messagesRef = doc(collection(db, "outings", outingId, "messages"));

    try {
      await runTransaction(db, async (tx) => {
        const outingSnap = await tx.get(outingRef);
        if (!outingSnap.exists()) {
          throw new Error("Outing not found");
        }
        if (outingSnap.data().hostId !== hostId) {
          throw new Error("Only host can reveal location");
        }

        // Update outing to reveal location
        tx.update(outingRef, {
          manualReveal: true,
          updatedAt: serverTimestamp(),
        });

        // Add system message
        tx.set(messagesRef, {
          type: "system",
          text: "Location revealed by host",
          createdAt: serverTimestamp(),
        });
      });
    } catch (error) {
      logger.error("reveal.location.failed", { error, outingId, hostId });
      throw error;
    }
  },

  /**
   * Host cancels the outing
   */
  async cancelOuting(outingId: string, hostId: string) {
    const outingRef = doc(db, "outings", outingId);
    const messagesRef = doc(collection(db, "outings", outingId, "messages"));

    try {
      await runTransaction(db, async (tx) => {
        const outingSnap = await tx.get(outingRef);
        if (!outingSnap.exists()) {
          throw new Error("Outing not found");
        }
        if (outingSnap.data().hostId !== hostId) {
          throw new Error("Only host can cancel outing");
        }

        // Update status
        tx.update(outingRef, {
          status: "cancelled",
          updatedAt: serverTimestamp(),
        });

        // Add system message
        tx.set(messagesRef, {
          type: "system",
          text: "Event cancelled by host",
          createdAt: serverTimestamp(),
        });
      });
    } catch (error) {
      logger.error("cancel.outing.failed", { error, outingId, hostId });
      throw error;
    }
  },

  /**
   * Phase 2: Join waitlist when event is full
   */
  async joinWaitlist(outingId: string, userId: string, hostId: string, meta: Record<string, unknown>) {
    const waitlistRef = doc(db, "outings", outingId, "waitlist", userId);
    const outingRef = doc(db, "outings", outingId);
    
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(waitlistRef);
      if (existing.exists()) return; // Already on waitlist
      
      const outingSnap = await tx.get(outingRef);
      if (!outingSnap.exists()) throw new Error("Outing not found");
      
      const outingData = outingSnap.data();
      if (outingData.approvedCount < outingData.maxGuests) {
        throw new Error("Event is not full");
      }
      
      tx.set(waitlistRef, {
        userId,
        createdAt: serverTimestamp(),
        ...meta,
      });
      
      tx.update(outingRef, {
        waitlistCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    });
    
    logger.info("outing.waitlist.joined", { outingId, userId });
  },

  /**
   * Phase 2: Promote next user from waitlist
   */
  async promoteFromWaitlist(outingId: string) {
    const outingRef = doc(db, "outings", outingId);
    const waitlistQuery = query(
      collection(db, "outings", outingId, "waitlist"),
      orderBy("createdAt", "asc"),
      limit(1)
    );
    
    try {
      const waitlistSnap = await getDocs(waitlistQuery);
      if (waitlistSnap.empty) return; // No one on waitlist
      
      const nextUser = waitlistSnap.docs[0];
      const userId = nextUser.id;
      const userData = nextUser.data();
      
      await runTransaction(db, async (tx) => {
        const outingSnap = await tx.get(outingRef);
        if (!outingSnap.exists()) return;
        
        const outingData = outingSnap.data();
        if (outingData.approvedCount >= outingData.maxGuests) return; // Still full
        
        // Remove from waitlist
        tx.delete(doc(db, "outings", outingId, "waitlist", userId));
        
        // Add as member
        const memberRef = doc(db, "outings", outingId, "members", userId);
        const userIndexRef = doc(db, "users", userId, "activeOutings", outingId);
        
        tx.set(memberRef, {
          role: "member",
          joinedAt: serverTimestamp(),
        });
        
        tx.set(userIndexRef, {
          outingId,
          hostId: outingData.hostId,
          title: outingData.title || "Outing",
          coverImageUrl: outingData.coverImageUrl || null,
          dateTime: outingData.dateTime || null,
          area: outingData.area || null,
        }, { merge: true });
        
        // Build single update object to avoid multiple writes to same document
        const outingUpdate: Record<string, unknown> = {
          approvedCount: increment(1),
          waitlistCount: increment(-1),
          updatedAt: serverTimestamp(),
        };
        
        // Auto-close if now full (only if maxGuests > 0 to avoid false positives)
        const maxGuests = outingData.maxGuests || 0;
        if (maxGuests > 0 && outingData.approvedCount + 1 >= maxGuests) {
          outingUpdate.status = "full";
        }
        
        // Single update call to avoid invalid-argument error
        tx.update(outingRef, outingUpdate);
      });
      
      logger.info("outing.waitlist.promoted", { outingId, userId });
    } catch (error) {
      logger.error("waitlist.promote.failed", { error, outingId });
    }
  },
};
