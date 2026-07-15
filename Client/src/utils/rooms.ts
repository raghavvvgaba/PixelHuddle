export const generateRoomId = (length = 6) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let roomId = "";

  for (let index = 0; index < length; index += 1) {
    roomId += chars[Math.floor(Math.random() * chars.length)];
  }

  return roomId;
};

export const normalizeRoomId = (value = "") =>
  value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
