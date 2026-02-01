import { Outing } from "../types/outing";
import { OutingRequestStatus } from "./outingStorage";

export type EventPolicy = {
  primaryCTA: "Request" | "JoinNow" | "Requested" | "OpenChat" | "Declined" | "Ended" | "Full";
  ctaEnabled: boolean;
  ctaLabel: string;
  shouldShowExactAddress: boolean;
  requiresRSVP: boolean;
  canKickMembers: boolean;
  notificationMode: "every_request" | "spike_only";
  chatWritable: boolean;
  showRequestStatus: boolean;
  requestStatusLabel?: string;
};

type PolicyInputs = {
  outing: Outing;
  currentUserId: string;
  requestStatus: OutingRequestStatus | null;
  isMember: boolean;
  isHost: boolean;
  now?: Date;
};

/**
 * Centralized policy engine for dual-mode events.
 * All UI decisions, permissions, and behaviors flow through this.
 */
export function getEventPolicy(inputs: PolicyInputs): EventPolicy {
  const { outing, currentUserId, requestStatus, isMember, isHost, now = new Date() } = inputs;
  
  const isCurated = outing.eventMode === "curated";
  const isFast = outing.eventMode === "fast";
  const spotsLeft = outing.maxGuests - outing.approvedCount;
  const isFull = spotsLeft <= 0;
  const isEnded = outing.status === "ended" || outing.status === "cancelled";
  
  // Check if chat is expired
  let chatExpired = false;
  if (outing.chatExpiresAt?.toDate) {
    chatExpired = now > outing.chatExpiresAt.toDate();
  } else if (outing.chatExpiresAt) {
    // Handle Timestamp object
    const expiresAt = outing.chatExpiresAt as any;
    if (expiresAt.seconds) {
      chatExpired = now.getTime() > expiresAt.seconds * 1000;
    }
  }
  
  // Check if location should be revealed
  let shouldShowExactAddress = false;
  if (isHost) {
    shouldShowExactAddress = true; // Host always sees address
  } else if (isMember) {
    if (outing.locationRevealMode === "host_triggered") {
      // Only host can reveal, check if revealed (would need a field like `locationRevealed`)
      shouldShowExactAddress = false; // Default to false, host must manually reveal
    } else if (outing.locationRevealMode === "timelock" && outing.revealAt) {
      const revealAt = outing.revealAt.toDate ? outing.revealAt.toDate() : new Date(outing.revealAt);
      shouldShowExactAddress = now >= revealAt;
    } else {
      // Default: show to members
      shouldShowExactAddress = true;
    }
  }
  
  // Determine primary CTA
  let primaryCTA: EventPolicy["primaryCTA"];
  let ctaEnabled = true;
  let ctaLabel = "";
  let showRequestStatus = false;
  let requestStatusLabel: string | undefined;
  
  if (isEnded) {
    primaryCTA = "Ended";
    ctaEnabled = false;
    ctaLabel = "Event Ended";
  } else if (isHost) {
    primaryCTA = "OpenChat";
    ctaEnabled = !chatExpired;
    ctaLabel = chatExpired ? "Chat Closed" : "Manage Event";
  } else if (isMember) {
    primaryCTA = "OpenChat";
    ctaEnabled = !chatExpired;
    ctaLabel = chatExpired ? "Chat Closed" : "Open Chat";
  } else if (isCurated) {
    // Curated mode logic
    if (requestStatus === "approved") {
      primaryCTA = "OpenChat";
      ctaEnabled = !chatExpired;
      ctaLabel = chatExpired ? "Chat Closed" : "Open Chat";
      showRequestStatus = true;
      requestStatusLabel = "APPROVED ✅";
    } else if (requestStatus === "pending") {
      primaryCTA = "Requested";
      ctaEnabled = false;
      ctaLabel = "Requested";
      showRequestStatus = true;
      requestStatusLabel = "REQUEST SENT";
    } else if (requestStatus === "declined") {
      primaryCTA = "Declined";
      ctaEnabled = false;
      ctaLabel = "Declined";
      showRequestStatus = true;
      requestStatusLabel = "NOT APPROVED";
    } else {
      // No request
      if (isFull || outing.status === "full") {
        // Phase 2: Show "Join Waitlist" when full
        primaryCTA = "Request";
        ctaEnabled = true;
        ctaLabel = "Join Waitlist";
      } else {
        primaryCTA = "Request";
        ctaEnabled = true;
        ctaLabel = "Request to Join";
      }
    }
  } else if (isFast) {
    // Fast mode logic
    if (isFull || outing.status === "full") {
      // Phase 2: Show "Join Waitlist" when full
      primaryCTA = "Request"; // Reuse Request for waitlist
      ctaEnabled = true;
      ctaLabel = "Join Waitlist";
    } else {
      primaryCTA = "JoinNow";
      ctaEnabled = true;
      ctaLabel = "Join Now";
    }
  } else {
    // Fallback (shouldn't happen)
    primaryCTA = "Request";
    ctaEnabled = false;
    ctaLabel = "Join";
  }
  
  // RSVP requirements
  const requiresRSVP = isCurated && isMember && !isHost;
  
  // Host permissions
  const canKickMembers = isHost && isCurated; // Only curated events allow kicking
  
  // Notification mode
  const notificationMode: "every_request" | "spike_only" = isCurated 
    ? "every_request" 
    : "spike_only";
  
  // Chat writable
  const chatWritable = isMember && !chatExpired && !isEnded;
  
  return {
    primaryCTA,
    ctaEnabled,
    ctaLabel,
    shouldShowExactAddress,
    requiresRSVP,
    canKickMembers,
    notificationMode,
    chatWritable,
    showRequestStatus,
    requestStatusLabel,
  };
}

/**
 * Helper to get human-readable mode description
 */
export function getModeDescription(eventMode: "curated" | "fast"): string {
  return eventMode === "curated" 
    ? "Host approves requests" 
    : "Auto-approve until full";
}

/**
 * Helper to get mode badge label
 */
export function getModeBadge(eventMode: "curated" | "fast"): string {
  return eventMode === "curated" ? "CURATED" : "FAST JOIN";
}


