import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebaseApp";
import { logger } from "./logger";
import {
  getChatExpiryHours,
  getDailyVibeLimit,
  getMaxActiveChats,
  REQUEST_COOLDOWN_DAYS,
  REQUEST_EXPIRY_HOURS,
} from "./connectionPolicy";
import { Profile } from "../types/profile";
import { ConnectionRequest } from "../types/connection";

export type SendVibeResult = {
  status: "sent" | "pending" | "accepted" | "connected";
  requestId?: string;
  chatId?: string;
};

export const getRequestId = (fromUid: string, toUid: string) => `${fromUid}_${toUid}`;

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const toTimestamp = (date: Date) => Timestamp.fromDate(date);

const addHours = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return toTimestamp(date);
};

const isExpired = (expiresAt?: any) => {
  if (!expiresAt?.toDate) return false;
  return expiresAt.toDate().getTime() < Date.now();
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
  } catch (error) {
    logger.error("connection.notification.failed", { error, userId, payload });
  }
};

export const connectionStorage = {
  async sendVibe({
    fromUid,
    toUid,
    fromProfile,
    vibeScore,
    mutualTagIds,
    mutualInterestIds,
    message,
    source,
    city,
  }: {
    fromUid: string;
    toUid: string;
    fromProfile?: Profile | null;
    vibeScore: number;
    mutualTagIds: string[];
    mutualInterestIds: string[];
    message?: string;
    source: "people_feed" | "profile" | "post_event";
    city?: string;
  }): Promise<SendVibeResult> {
    const requestId = getRequestId(fromUid, toUid);
    const reverseId = getRequestId(toUid, fromUid);
    const requestRef = doc(db, "connectionRequests", requestId);
    const reverseRef = doc(db, "connectionRequests", reverseId);

    try {
      const reverseSnap = await getDoc(reverseRef);
      if (reverseSnap.exists()) {
        const reverseData = reverseSnap.data() as ConnectionRequest;
        if (reverseData.status === "pending" && reverseData.toUid === fromUid) {
          const accepted = await connectionStorage.acceptVibe({
            requestId: reverseId,
            toUid: fromUid,
            profile: fromProfile || undefined,
          });
          return { status: "accepted", chatId: accepted.chatId, requestId: reverseId };
        }
      }

      let outcome: SendVibeResult = { status: "sent", requestId };
      const dateKey = getDateKey();
      const usageRef = doc(db, "users", fromUid, "usage", dateKey);
      const connectionRef = doc(db, "users", fromUid, "connections", toUid);
      const blockARef = doc(db, "blocks", `${fromUid}_${toUid}`);
      const blockBRef = doc(db, "blocks", `${toUid}_${fromUid}`);

      await runTransaction(db, async (tx) => {
        const [
          requestSnap,
          connectionSnap,
          blockASnap,
          blockBSnap,
          usageSnap,
        ] = await Promise.all([
          tx.get(requestRef),
          tx.get(connectionRef),
          tx.get(blockARef),
          tx.get(blockBRef),
          tx.get(usageRef),
        ]);

        if (blockASnap.exists() || blockBSnap.exists()) {
          const error: any = new Error("Blocked");
          error.code = "BLOCKED";
          throw error;
        }

        if (connectionSnap.exists()) {
          outcome = { status: "connected" };
          return;
        }

        if (requestSnap.exists()) {
          const existing = requestSnap.data() as ConnectionRequest;
          if (existing.status === "pending") {
            outcome = { status: "pending", requestId };
            return;
          }
          if (
            existing.status === "rejected" &&
            existing.decisionAt?.toDate
          ) {
            const decisionAt = existing.decisionAt.toDate();
            if (decisionAt.getTime() > Date.now() - REQUEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) {
              const error: any = new Error("Cooldown");
              error.code = "COOLDOWN";
              throw error;
            }
          }
        }

        const dailyLimit = getDailyVibeLimit(fromProfile || undefined);
        const used = usageSnap.exists() ? usageSnap.data().connectionRequests || 0 : 0;
        if (dailyLimit !== Infinity && used >= dailyLimit) {
          const error: any = new Error("Limit reached");
          error.code = "LIMIT";
          throw error;
        }

        tx.set(requestRef, {
          fromUid,
          toUid,
          status: "pending",
          vibeScore,
          mutualTagIds,
          mutualInterestIds,
          message: message || null,
          createdAt: serverTimestamp(),
          expiresAt: addHours(REQUEST_EXPIRY_HOURS),
          city: city || fromProfile?.city || null,
          source,
          fromName: fromProfile?.name || null,
          fromPhoto: fromProfile?.profile_photo_url || null,
        });

        tx.set(
          usageRef,
          {
            dateKey,
            connectionRequests: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      if (outcome.status === "sent") {
        const senderName = fromProfile?.name || "Someone";
        await createNotification(toUid, {
          type: "connection_request",
          fromUid,
          fromName: senderName,
          fromPhoto: fromProfile?.profile_photo_url || null,
          vibeScore,
          requestId,
          title: "New vibe request",
          body: `Vibe request from ${senderName} · ${vibeScore}% match`,
        });
      }

      return outcome;
    } catch (error: any) {
      logger.error("connection.send.failed", { error, fromUid, toUid });
      throw error;
    }
  },

  async acceptVibe({
    requestId,
    toUid,
    profile,
  }: {
    requestId: string;
    toUid: string;
    profile?: Profile | null;
  }) {
    const requestRef = doc(db, "connectionRequests", requestId);

    try {
      const requestSnap = await getDoc(requestRef);
      if (!requestSnap.exists()) {
        const error: any = new Error("Request not found");
        error.code = "NOT_FOUND";
        throw error;
      }

      const request = requestSnap.data() as ConnectionRequest;
      if (request.toUid !== toUid) {
        const error: any = new Error("Unauthorized");
        error.code = "UNAUTHORIZED";
        throw error;
      }
      if (request.status !== "pending") {
        const error: any = new Error("Already handled");
        error.code = "ALREADY_HANDLED";
        throw error;
      }
      if (isExpired(request.expiresAt)) {
        const error: any = new Error("Expired");
        error.code = "EXPIRED";
        throw error;
      }

      const chatId = requestId;
      const chatRef = doc(db, "directChats", chatId);
      const messageRef = doc(collection(db, "directChats", chatId, "messages"));
      const fromUid = request.fromUid;
      const [fromSnap, toSnap] = await Promise.all([
        getDoc(doc(db, "users", fromUid)),
        getDoc(doc(db, "users", toUid)),
      ]);
      const fromName = fromSnap.exists() ? (fromSnap.data() as any).name : "Someone";
      const toName = toSnap.exists() ? (toSnap.data() as any).name : "Someone";

      const expiryHours = getChatExpiryHours(profile || undefined);

      // Connection refs for immediate addition
      const connectionA = doc(db, "users", fromUid, "connections", toUid);
      const connectionB = doc(db, "users", toUid, "connections", fromUid);
      const userARef = doc(db, "users", fromUid);
      const userBRef = doc(db, "users", toUid);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(requestRef);
        if (!snap.exists()) {
          logger.warn("connection.accept.request_not_found", { requestId, toUid });
          return;
        }
        const data = snap.data() as ConnectionRequest;
        if (data.status !== "pending") {
          logger.warn("connection.accept.request_not_pending", { requestId, toUid, status: data.status });
          return;
        }
        
        logger.info("connection.accept.processing", { requestId, fromUid, toUid, chatId });

        tx.update(requestRef, {
          status: "accepted",
          decisionAt: serverTimestamp(),
          decidedBy: toUid,
          acceptedAt: serverTimestamp(),
        });

        tx.set(chatRef, {
          participants: [fromUid, toUid],
          createdAt: serverTimestamp(),
          expiresAt: addHours(expiryHours),
          state: "active",
          lastMessage: {
            text: "✨ You both vibed. Say hi.",
            senderUid: null,
            createdAt: serverTimestamp(),
          },
        });

        tx.set(messageRef, {
          type: "system",
          senderUid: null,
          text: "✨ You both vibed. Say hi.",
          createdAt: serverTimestamp(),
        });

        // Immediately add connections and increment counters (idempotent)
        const connASnap = await tx.get(connectionA);
        const connBSnap = await tx.get(connectionB);

        // Only create connection and increment if it doesn't already exist
        if (!connASnap.exists()) {
          logger.info("connection.accept.creating_connection_a", { fromUid, toUid, chatId });
          tx.set(
            connectionA,
            {
              otherUid: toUid,
              sinceAt: serverTimestamp(),
              sourceChatId: chatId,
            },
            { merge: true }
          );
          tx.update(userARef, {
            connectionsCount: increment(1),
          });
        } else {
          logger.info("connection.accept.connection_a_exists", { fromUid, toUid });
        }

        if (!connBSnap.exists()) {
          logger.info("connection.accept.creating_connection_b", { fromUid, toUid, chatId });
          tx.set(
            connectionB,
            {
              otherUid: fromUid,
              sinceAt: serverTimestamp(),
              sourceChatId: chatId,
            },
            { merge: true }
          );
          tx.update(userBRef, {
            connectionsCount: increment(1),
          });
        } else {
          logger.info("connection.accept.connection_b_exists", { fromUid, toUid           });
        }
      });

      logger.info("connection.accept.completed", { requestId, fromUid, toUid, chatId });

      await createNotification(fromUid, {
        type: "connection_accepted",
        fromUid: toUid, // Other user (acceptor) is the "from" for sender
        toUid,
        chatId,
        requestId,
        title: "You're connected 🎉",
        body: `You're connected with ${toName}. Say hi.`,
      });
      await createNotification(toUid, {
        type: "connection_accepted",
        fromUid, // Sender is the "from" for receiver
        toUid,
        chatId,
        requestId,
        title: "Chat opened",
        body: `You're connected with ${fromName}.`,
      });

      return { chatId };
    } catch (error: any) {
      logger.error("connection.accept.failed", { error, requestId, toUid });
      throw error;
    }
  },

  async rejectVibe({ requestId, toUid }: { requestId: string; toUid: string }) {
    const requestRef = doc(db, "connectionRequests", requestId);

    try {
      const snap = await getDoc(requestRef);
      if (!snap.exists()) return;
      const request = snap.data() as ConnectionRequest;
      if (request.toUid !== toUid || request.status !== "pending") return;

      await updateDoc(requestRef, {
        status: "rejected",
        decisionAt: serverTimestamp(),
        decidedBy: toUid,
      });

      const toSnap = await getDoc(doc(db, "users", toUid));
      const toName = toSnap.exists() ? (toSnap.data() as any).name : "someone";

      await createNotification(request.fromUid, {
        type: "connection_rejected",
        toUid,
        requestId,
        title: "Not a match this time",
        body: `${toName} passed on your vibe.`,
      });
    } catch (error) {
      logger.error("connection.reject.failed", { error, requestId });
    }
  },

  async expireIfNeeded(requestId: string, toUid: string) {
    const requestRef = doc(db, "connectionRequests", requestId);
    try {
      const snap = await getDoc(requestRef);
      if (!snap.exists()) return false;
      const request = snap.data() as ConnectionRequest;
      if (request.toUid !== toUid) return false;
      if (request.status !== "pending") return false;
      if (!isExpired(request.expiresAt)) return false;

      await updateDoc(requestRef, {
        status: "expired",
        decisionAt: serverTimestamp(),
        decidedBy: toUid,
      });

      await createNotification(request.fromUid, {
        type: "connection_expired",
        toUid,
        requestId,
        title: "Vibe request expired",
        body: "Your vibe request timed out.",
      });
      return true;
    } catch (error) {
      logger.error("connection.expire.failed", { error, requestId });
      return false;
    }
  },

  async sendDirectMessage({
    chatId,
    senderUid,
    text,
  }: {
    chatId: string;
    senderUid: string;
    text: string;
  }) {
    const chatRef = doc(db, "directChats", chatId);
    const messageRef = doc(collection(db, "directChats", chatId, "messages"));

    await runTransaction(db, async (tx) => {
      const chatSnap = await tx.get(chatRef);
      if (!chatSnap.exists()) return;
      const chat = chatSnap.data() as any;
      if (chat.state === "expired" || chat.state === "blocked") return;

      tx.set(messageRef, {
        type: "user",
        senderUid,
        text,
        createdAt: serverTimestamp(),
      });
      tx.update(chatRef, {
        lastMessage: {
          text,
          senderUid,
          createdAt: serverTimestamp(),
        },
      });
    });
  },

  async markSaveIntent({ chatId, uid }: { chatId: string; uid: string }) {
    const intentRef = doc(db, "directChats", chatId, "saveIntent", uid);
    try {
      await setDoc(intentRef, { createdAt: serverTimestamp() }, { merge: true });
      await connectionStorage.finalizeSaveIfMutual(chatId);
    } catch (error) {
      logger.error("connection.save.intent.failed", { error, chatId });
    }
  },

  async finalizeSaveIfMutual(chatId: string) {
    const chatRef = doc(db, "directChats", chatId);
    try {
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) return;
      const chat = chatSnap.data() as any;
      const participants = chat.participants || [];
      if (participants.length !== 2) return;

      const [a, b] = participants;
      const intentA = await getDoc(doc(db, "directChats", chatId, "saveIntent", a));
      const intentB = await getDoc(doc(db, "directChats", chatId, "saveIntent", b));

      if (!intentA.exists() || !intentB.exists()) return;

      const batch: Promise<any>[] = [];
      batch.push(
        setDoc(
          doc(db, "users", a, "connections", b),
          {
            otherUid: b,
            sinceAt: serverTimestamp(),
            sourceChatId: chatId,
          },
          { merge: true }
        )
      );
      batch.push(
        setDoc(
          doc(db, "users", b, "connections", a),
          {
            otherUid: a,
            sinceAt: serverTimestamp(),
            sourceChatId: chatId,
          },
          { merge: true }
        )
      );
      batch.push(updateDoc(chatRef, { state: "saved" }).catch(() => null));

      await Promise.all(batch);

      await createNotification(a, {
        type: "saved_connection_confirmed",
        otherUid: b,
        chatId,
        title: "Connection saved",
        body: "You’re now saved connections.",
      });
      await createNotification(b, {
        type: "saved_connection_confirmed",
        otherUid: a,
        chatId,
        title: "Connection saved",
        body: "You’re now saved connections.",
      });
    } catch (error) {
      logger.error("connection.save.finalize.failed", { error, chatId });
    }
  },

  async blockUser({
    blockerUid,
    blockedUid,
    reason,
  }: {
    blockerUid: string;
    blockedUid: string;
    reason?: string;
  }) {
    try {
      const blockRef = doc(db, "blocks", `${blockerUid}_${blockedUid}`);
      await setDoc(blockRef, {
        blockerUid,
        blockedUid,
        reason: reason || null,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("connection.block.failed", { error, blockerUid, blockedUid });
    }
  },

  async reportUser({
    reporterUid,
    reportedUid,
    reason,
    context,
  }: {
    reporterUid: string;
    reportedUid: string;
    reason: string;
    context?: string;
  }) {
    try {
      await addDoc(collection(db, "reports"), {
        reporterUid,
        reportedUid,
        reason,
        context: context || null,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      logger.error("connection.report.failed", { error, reporterUid, reportedUid });
    }
  },

  async getActiveChatCount(uid: string) {
    try {
      const snap = await getDocs(
        query(
          collection(db, "directChats"),
          where("participants", "array-contains", uid),
          where("state", "==", "active")
        )
      );
      const now = Date.now();
      return snap.docs.filter((docItem) => {
        const data = docItem.data() as any;
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : null;
        return !expiresAt || expiresAt.getTime() > now;
      }).length;
    } catch (error) {
      logger.error("connection.active.count.failed", { error, uid });
      return 0;
    }
  },

  async canOpenChat(uid: string, profile?: Profile | null) {
    const maxChats = getMaxActiveChats(profile || undefined);
    if (maxChats === Infinity) return true;
    const count = await connectionStorage.getActiveChatCount(uid);
    return count < maxChats;
  },
};
