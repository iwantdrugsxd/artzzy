import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebaseApp";
import { logger } from "./logger";

const normalizeTitle = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export const backfillOutingTitleForHost = async (params: {
  outingId: string;
  hostId: string;
  currentTitle?: unknown;
}) => {
  const currentTitle = normalizeTitle(params.currentTitle);
  if (currentTitle) return currentTitle;

  try {
    const hostedIndexRef = doc(db, "users", params.hostId, "hostedOutings", params.outingId);
    const activeIndexRef = doc(db, "users", params.hostId, "activeOutings", params.outingId);

    const [hostedSnap, activeSnap] = await Promise.all([
      getDoc(hostedIndexRef),
      getDoc(activeIndexRef),
    ]);

    const recoveredTitle = normalizeTitle(hostedSnap.data()?.title) || normalizeTitle(activeSnap.data()?.title);
    if (!recoveredTitle) return null;

    await updateDoc(doc(db, "outings", params.outingId), {
      title: recoveredTitle,
      updatedAt: serverTimestamp(),
    });

    logger.info("outing.title.backfilled", { outingId: params.outingId });
    return recoveredTitle;
  } catch (error) {
    logger.error("outing.title.backfill.failed", { error, outingId: params.outingId });
    return null;
  }
};

