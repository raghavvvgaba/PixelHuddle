const GUEST_ID_KEY = "gathermeet-guest-id";
const GUEST_NAME_KEY = "gathermeet-guest-name";

const createGuestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createGuestName = () => {
  const adjectives = ["Bright", "Calm", "Kind", "Quick", "Sunny", "Witty"];
  const nouns = ["Badger", "Finch", "Fox", "Otter", "Panda", "Robin"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective} ${noun}`;
};

export const getRoomIdentity = (user: AuthUser | null): Required<RoomIdentity> => {
  if (user?.username || user?.email) {
    return {
      userId: user.email || user.username,
      displayName: user.username || user.email.split("@")[0] || "Guest",
    };
  }

  let userId = localStorage.getItem(GUEST_ID_KEY);
  let displayName = localStorage.getItem(GUEST_NAME_KEY);

  if (!userId) {
    userId = createGuestId();
    localStorage.setItem(GUEST_ID_KEY, userId);
  }

  if (!displayName) {
    displayName = createGuestName();
    localStorage.setItem(GUEST_NAME_KEY, displayName);
  }

  return { userId, displayName };
};
import type { RoomIdentity } from "../../../Shared/realtime";
import type { AuthUser } from "../contexts/AuthContext";
