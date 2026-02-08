import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseApp";
import { logger } from "./logger";

const CODE_LENGTH = 8;
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generates a random user code (uppercase letters and numbers)
 */
export const generateUserCode = (): string => {
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
  try {
    const q = query(collection(db, "users"), where("user_code", "==", code));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    logger.error("userCode.check.failed", { error, code });
    // On error, assume it's taken to be safe
    return true;
  }
};

/**
 * Generates a unique user code by checking against existing codes
 * Will retry up to 10 times to find a unique code
 */
export const ensureUniqueUserCode = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateUserCode();
    const isTaken = await isUserCodeTaken(code);

    if (!isTaken) {
      return code;
    }

    attempts++;
    logger.warn("userCode.collision", { code, attempt: attempts });
  }

  // If we've exhausted attempts, throw an error
  throw new Error("Failed to generate unique user code after multiple attempts");
};
