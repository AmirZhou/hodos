"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

interface UsePresenceOptions {
  campaignId: Id<"campaigns">;
  userId: Id<"users">;
  enabled?: boolean;
}

export function usePresence({
  campaignId,
  userId,
  enabled = true,
}: UsePresenceOptions) {
  const heartbeat = useMutation(api.presence.heartbeat);
  const disconnect = useMutation(api.presence.disconnect);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!enabled) return;
    try {
      await heartbeat({ campaignId, userId });
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
    }
  }, [heartbeat, campaignId, userId, enabled]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect({ campaignId, userId });
    } catch (error) {
      console.error("Failed to send disconnect:", error);
    }
  }, [disconnect, campaignId, userId]);

  useEffect(() => {
    if (!enabled) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      handleDisconnect();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleDisconnect();
    };
  }, [enabled, sendHeartbeat, handleDisconnect]);

  return { sendHeartbeat, disconnect: handleDisconnect };
}
