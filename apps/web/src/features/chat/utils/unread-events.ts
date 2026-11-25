// apps/web/src/features/chat/utils/unread-events.ts
const EVENT = "umsspira:chat-unread-refresh";

export const emitUnreadRefresh = (): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
};

export const onUnreadRefresh = (callback: () => void): (() => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
};