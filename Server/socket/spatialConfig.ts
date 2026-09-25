const WORLD_WIDTH = 32 * 32;
const WORLD_HEIGHT = 22 * 32;

const PROXIMITY_ENTER_DISTANCE = 176;
const PROXIMITY_EXIT_DISTANCE = 224;
const MAX_SPATIAL_PEERS = 3;

const PRIVATE_ZONES = [
  {
    id: "focus-room",
    name: "Focus Room",
    x: 0.45 * 32,
    y: 11.8 * 32,
    width: 8.35 * 32,
    height: 5.85 * 32,
  },
  {
    id: "boardroom",
    name: "Boardroom",
    x: 10.35 * 32,
    y: 14.3 * 32,
    width: 7.95 * 32,
    height: 7.25 * 32,
  },
];

const getPrivateZone = (x: number, y: number) =>
  PRIVATE_ZONES.find(
    (zone) =>
      x >= zone.x &&
      x <= zone.x + zone.width &&
      y >= zone.y &&
      y <= zone.y + zone.height
  ) || null;

export {
  MAX_SPATIAL_PEERS,
  PRIVATE_ZONES,
  PROXIMITY_ENTER_DISTANCE,
  PROXIMITY_EXIT_DISTANCE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getPrivateZone,
};
