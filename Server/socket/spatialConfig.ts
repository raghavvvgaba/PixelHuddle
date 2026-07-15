const WORLD_WIDTH = 40 * 32;
const WORLD_HEIGHT = 30 * 32;

const PROXIMITY_ENTER_DISTANCE = 176;
const PROXIMITY_EXIT_DISTANCE = 224;
const MAX_SPATIAL_PEERS = 3;

const PRIVATE_ZONES = [
  {
    id: "garden-nook",
    name: "Garden Nook",
    x: 2 * 32,
    y: 13 * 32,
    width: 6 * 32,
    height: 3 * 32,
  },
  {
    id: "sunset-table",
    name: "Sunset Table",
    x: 11 * 32,
    y: 16 * 32,
    width: 5 * 32,
    height: 3 * 32,
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
