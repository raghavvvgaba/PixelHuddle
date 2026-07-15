import Phaser from 'phaser';
import { PRIVATE_ZONES, PROXIMITY_ENTER_DISTANCE } from './spatialConfig';
import type { Player, PlayerMovedPayload } from '../../../Shared/realtime';

interface LocalPlayerState {
  x: number;
  y: number;
  flipX: boolean;
}

interface RemotePlayer {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  aura: Phaser.GameObjects.Arc;
  targetX: number;
  targetY: number;
}

type ScenePlayer = Pick<Player, "socketId" | "x" | "y" | "flipX"> &
  Partial<Pick<Player, "displayName">>;

interface PresenceState {
  selfSocketId?: string | null;
  players?: Player[];
}

// Tile frame indices from the Kenney Roguelike Modern City sprite sheet
// Sprite sheet: 37 cols x 28 rows = 1036 tiles, each 16x16px
const T = {
  // Ground (row 0)
  DIRT: 1,
  CONCRETE_DARK: 4,
  CONCRETE: 5,
  CONCRETE_LIGHT: 6,
  GRASS_DARK: 8,
  GRASS: 9,
  GRASS_LIGHT: 10,

  // Roads (rows 0-2)
  ROAD_H1: 15,      // horizontal with yellow center line
  ROAD_H2: 16,      // horizontal with white dashes
  ROAD_EDGE_T: 17,  // road top edge
  ROAD_EDGE_B: 18,  // road bottom edge
  ROAD_CORNER_NE: 21,
  ROAD_CORNER_NW: 22,
  ROAD_CORNER_SE: 23,
  ROAD_CORNER_SW: 24,
  ROAD_T_UP: 25,    // T pointing up (from horizontal road)
  ROAD_T_DOWN: 26,
  ROAD_T_LEFT: 27,
  ROAD_T_RIGHT: 28,
  ROAD_CROSS: 29,
  ROAD_V1: 40,      // vertical road (row 1)
  ROAD_V2: 41,

  // Grass-to-road transitions (row 2)
  GRASS_ROAD_TL: 78,
  GRASS_ROAD_TR: 79,
  GRASS_ROAD_BL: 82,  // approximate
  GRASS_ROAD_BR: 83,

  // Buildings (rows 3-4)
  BLDG_WALL_DARK: 111,
  BLDG_WINDOW_DARK: 112,
  BLDG_WALL_DARK2: 113,
  BLDG_WALL_DARK3: 114,
  BLDG_ROOF_DARK: 115,
  BLDG_WALL_BLUE: 121,
  BLDG_WINDOW_BLUE: 122,
  BLDG_WALL_BLUE2: 123,
  BLDG_ROOF_BLUE: 124,
  BLDG_WALL_RED: 131,
  BLDG_WINDOW_RED: 132,
  BLDG_WALL_RED2: 133,
  BLDG_WALL_BEIGE: 141,
  BLDG_WINDOW_BEIGE: 142,
  BLDG_WALL_BEIGE2: 143,
  BLDG_WALL_GRAY: 148,
  BLDG_WINDOW_GRAY: 149,
  BLDG_WALL_GRAY2: 150,
  BLDG_WALL_WHITE: 158,
  BLDG_WINDOW_WHITE: 159,
  BLDG_WALL_WHITE2: 160,

  // Doors (row 5)
  DOOR_DARK: 185,
  DOOR_LIGHT: 186,
  DOOR_OPEN: 187,
  DOOR_RED: 188,
  DOOR_BLUE: 189,

  // Interior floors (row 5)
  INDOOR_FLOOR: 193,
  INDOOR_FLOOR2: 194,
  INDOOR_CARPET: 195,
  INDOOR_WALL: 200,

  // Furniture (row 7)
  TABLE_DARK: 259,
  TABLE_LIGHT: 260,
  CHAIR_DARK: 266,
  CHAIR_LIGHT: 267,
  SHELF: 276,
  DESK: 281,
  COMPUTER: 296,

  // Bushes & plants (rows 11-12)
  BUSH_SMALL: 407,
  BUSH_ROUND: 408,
  BUSH_FLOWER: 409,
  HEDGE: 410,
  TREE_SMALL: 416,
  TREE_SMALL2: 417,
  TREE_MEDIUM: 425,
  TREE_MEDIUM2: 426,
  TREE_ROUND: 430,
  TREE_ROUND2: 431,
  TREE_LARGE: 440,
  TREE_PINE: 450,
  TREE_PINE2: 451,
  FENCE: 465,

  // Vehicles (rows 13-14)
  CAR_BLUE: 481,
  CAR_RED: 482,
  CAR_WHITE: 483,
  CAR_GREEN: 484,
  CAR_YELLOW: 485,
  CAR_GRAY: 486,
  TRUCK_WHITE: 500,
  TRUCK_RED: 501,
  VAN_BLUE: 510,

  // Street objects (rows 15-16)
  LAMP: 555,
  LAMP2: 556,
  TRAFFIC_LIGHT: 560,
  BENCH: 570,
  BENCH2: 571,
  TRASH: 580,
  TRASH2: 581,
  HYDRANT: 590,
  BARRIER: 595,
  SIGN: 600,
};

const TILE_SIZE = 16;
const SCALE = 2;
const D = TILE_SIZE * SCALE; // 32px display

const W = 40; // grid width
const H = 30; // grid height

// --- Build maps programmatically ---
function buildMaps() {
  // 0 = no tile rendered
  const ground = Array.from({ length: H }, () => Array(W).fill(0));
  // 0 = no object, >0 = tile index (collision)
  const objects = Array.from({ length: H }, () => Array(W).fill(0));

  // ---- Fill everything with grass ----
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++)
      ground[r][c] = T.GRASS;

  // ---- Buildings - Northwest block (rows 0-5, cols 0-10) ----
  const fillBldg = (
    r0: number,
    r1: number,
    c0: number,
    c1: number,
    wallTile: number,
    windowTile: number,
  ) => {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        objects[r][c] = (r === r0 || r === r1 || c === c0 || c === c1)
          ? (c % 3 === 0 && r !== r0 && r !== r1 ? windowTile : wallTile)
          : wallTile;
  };

  // NW building (dark)
  fillBldg(0, 4, 0, 9, T.BLDG_WALL_DARK, T.BLDG_WINDOW_DARK);
  objects[4][5] = T.DOOR_DARK; // door on south side
  ground[4][5] = T.CONCRETE;

  // NE building (blue)
  fillBldg(0, 4, 22, 34, T.BLDG_WALL_BLUE, T.BLDG_WINDOW_BLUE);
  objects[4][28] = T.DOOR_BLUE;
  ground[4][28] = T.CONCRETE;

  // SE building (red)
  fillBldg(24, 29, 25, 34, T.BLDG_WALL_RED, T.BLDG_WINDOW_RED);
  objects[24][29] = T.DOOR_RED;
  ground[24][29] = T.CONCRETE;

  // SW building (beige) - L-shaped
  fillBldg(24, 29, 0, 7, T.BLDG_WALL_BEIGE, T.BLDG_WINDOW_BEIGE);
  fillBldg(26, 29, 8, 12, T.BLDG_WALL_BEIGE, T.BLDG_WINDOW_BEIGE);
  objects[24][4] = T.DOOR_LIGHT;
  ground[24][4] = T.CONCRETE;

  // Small building - center-right (gray)
  fillBldg(1, 3, 14, 18, T.BLDG_WALL_GRAY, T.BLDG_WINDOW_GRAY);
  objects[3][16] = T.DOOR_OPEN;
  ground[3][16] = T.CONCRETE;

  // ---- Horizontal road 1 (rows 7-10) ----
  for (let c = 0; c < W; c++) {
    ground[6][c] = T.CONCRETE;  // north sidewalk
    ground[7][c] = T.ROAD_EDGE_T;
    ground[8][c] = T.ROAD_H1;
    ground[9][c] = T.ROAD_H2;
    ground[10][c] = T.ROAD_EDGE_B;
    ground[11][c] = T.CONCRETE; // south sidewalk
  }

  // ---- Horizontal road 2 (rows 21-24) ----
  for (let c = 0; c < W; c++) {
    ground[20][c] = T.CONCRETE;
    ground[21][c] = T.ROAD_EDGE_T;
    ground[22][c] = T.ROAD_H2;
    ground[23][c] = T.ROAD_H1;
    ground[24][c] = T.ROAD_EDGE_B;
    ground[25][c] = T.CONCRETE;
  }
  // Override: SE building already set, keep building tiles

  // ---- Vertical road (cols 19-20, rows 6-25) ----
  for (let r = 6; r <= 25; r++) {
    ground[r][18] = T.CONCRETE;
    ground[r][19] = T.ROAD_V1;
    ground[r][20] = T.ROAD_V2;
    ground[r][21] = T.CONCRETE;
  }

  // ---- Intersections ----
  ground[7][19] = T.ROAD_CORNER_NW;
  ground[7][20] = T.ROAD_CORNER_NE;
  ground[10][19] = T.ROAD_T_UP;
  ground[10][20] = T.ROAD_T_UP;
  ground[21][19] = T.ROAD_T_DOWN;
  ground[21][20] = T.ROAD_T_DOWN;
  ground[8][19] = T.ROAD_CROSS;
  ground[8][20] = T.ROAD_CROSS;
  ground[9][19] = T.ROAD_CROSS;
  ground[9][20] = T.ROAD_CROSS;
  ground[22][19] = T.ROAD_CROSS;
  ground[22][20] = T.ROAD_CROSS;
  ground[23][19] = T.ROAD_CROSS;
  ground[23][20] = T.ROAD_CROSS;

  // ---- Central park (rows 12-19, cols 1-17) ----
  // Park is already grass. Add a concrete path through the middle
  for (let c = 1; c < 18; c++) {
    ground[15][c] = T.CONCRETE_LIGHT;
    ground[16][c] = T.CONCRETE_LIGHT;
  }
  // Vertical path in park
  for (let r = 12; r < 20; r++) {
    ground[r][9] = T.CONCRETE_LIGHT;
    ground[r][10] = T.CONCRETE_LIGHT;
  }

  // ---- Parking lot area (rows 26-29, cols 25-34) ----
  // Ground is already grass from SE building, override
  for (let r = 26; r < H; r++)
    for (let c = 25; c < 35; c++)
      ground[r][c] = T.CONCRETE_DARK;
  // Parking lines
  for (let c = 26; c < 35; c += 3) {
    objects[26][c] = T.CAR_BLUE;
    objects[27][c + 1] = T.CAR_RED;
    objects[28][c] = T.CAR_WHITE;
  }

  // ---- Trees in park ----
  const parkTrees = [
    [12, 2], [12, 6], [12, 14], [12, 16],
    [13, 4], [13, 13],
    [14, 2], [14, 7], [14, 15],
    [17, 2], [17, 6], [17, 14], [17, 16],
    [18, 4], [18, 13],
    [19, 2], [19, 7], [19, 15],
  ];
  parkTrees.forEach(([r, c]) => { objects[r][c] = T.TREE_ROUND; });

  // Pine trees along edges
  const pines = [
    [0, 13], [0, 15], [0, 17], [0, 19], [0, 21],
    [5, 20], [5, 22], [5, 24],
  ];
  pines.forEach(([r, c]) => { objects[r][c] = T.TREE_PINE; });

  // Large trees
  objects[12][9] = T.TREE_LARGE;
  objects[19][10] = T.TREE_LARGE;

  // ---- Bushes along building edges ----
  const bushes = [
    [5, 1], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9],
    [5, 23], [5, 24], [5, 32], [5, 33], [5, 34],
    [23, 26], [23, 27], [23, 33], [23, 34],
  ];
  bushes.forEach(([r, c]) => { objects[r][c] = T.BUSH_ROUND; });

  // ---- Hedges along park boundary ----
  for (let c = 1; c < 18; c++) {
    objects[11][c] = (c === 9 || c === 10) ? 0 : T.HEDGE; // gap for path
  }
  for (let c = 1; c < 18; c++) {
    objects[20][c] = (c === 9 || c === 10) ? 0 : T.HEDGE;
  }

  // ---- Street lamps along roads ----
  const lamps = [
    [6, 3], [6, 10], [6, 16], [6, 25], [6, 32], [6, 38],
    [11, 3], [11, 10], [11, 25], [11, 32], [11, 38],
    [20, 3], [20, 10], [20, 25], [20, 32], [20, 38],
    [25, 3], [25, 10], [25, 25], [25, 32], [25, 38],
  ];
  lamps.forEach(([r, c]) => { objects[r][c] = T.LAMP; });

  // ---- Benches in park ----
  const benches = [
    [14, 9], [14, 10],
    [16, 4], [16, 5],
    [16, 14], [16, 15],
    [18, 9], [18, 10],
  ];
  benches.forEach(([r, c]) => { objects[r][c] = T.BENCH; });

  // ---- Trash cans ----
  const trash = [
    [6, 5], [11, 5], [15, 10], [20, 5], [25, 5],
  ];
  trash.forEach(([r, c]) => { objects[r][c] = T.TRASH; });

  // ---- Cars on roads ----
  objects[8][3] = T.CAR_YELLOW;
  objects[8][8] = T.CAR_GREEN;
  objects[9][30] = T.CAR_GRAY;
  objects[9][35] = T.CAR_RED;

  // ---- Indoor furniture (NW building interior) ----
  // Override ground inside buildings that have doors
  for (let r = 1; r < 4; r++)
    for (let c = 1; c < 9; c++)
      if (objects[r][c] === T.BLDG_WALL_DARK)
        ground[r][c] = T.INDOOR_FLOOR;
  // Tables and computers inside
  objects[1][2] = T.DESK;
  objects[1][3] = T.COMPUTER;
  objects[1][6] = T.DESK;
  objects[1][7] = T.COMPUTER;
  objects[2][4] = T.TABLE_LIGHT;
  objects[2][5] = T.CHAIR_LIGHT;
  objects[3][2] = T.SHELF;
  objects[3][7] = T.SHELF;

  // NE building interior
  for (let r = 1; r < 4; r++)
    for (let c = 23; c < 34; c++)
      if (objects[r][c] === T.BLDG_WALL_BLUE)
        ground[r][c] = T.INDOOR_CARPET;
  objects[1][25] = T.TABLE_DARK;
  objects[1][26] = T.TABLE_DARK;
  objects[1][30] = T.DESK;
  objects[1][31] = T.COMPUTER;
  objects[2][28] = T.CHAIR_DARK;
  objects[3][25] = T.SHELF;
  objects[3][32] = T.SHELF;

  // ---- Flowers near buildings ----
  const flowers = [
    [5, 5], [5, 25], [23, 28], [23, 31],
  ];
  flowers.forEach(([r, c]) => { objects[r][c] = T.BUSH_FLOWER; });

  // ---- Water feature in park ----
  ground[15][14] = 12;
  ground[15][15] = 13;
  ground[16][14] = 13;
  ground[16][15] = 14;

  // ---- Fence around parking lot ----
  for (let c = 24; c < 36; c++) {
    objects[25][c] = T.FENCE;
  }
  objects[25][29] = 0; // gap to enter parking

  // ---- Traffic light at intersection ----
  objects[7][18] = T.TRAFFIC_LIGHT;
  objects[7][21] = T.TRAFFIC_LIGHT;

  // ---- Hydrants ----
  objects[6][15] = T.HYDRANT;
  objects[25][20] = T.HYDRANT;

  // ---- Signs ----
  objects[6][8] = T.SIGN;
  objects[25][12] = T.SIGN;

  return { ground, objects };
}

const { ground: GROUND, objects: OBJECTS } = buildMaps();

export default class RoomScene extends Phaser.Scene {
  selfSocketId: string | null;
  remotePlayers: Map<string, RemotePlayer>;
  onLocalPlayerMove: ((playerState: LocalPlayerState) => void) | null;
  onSceneReady: ((scene: RoomScene) => void) | null;
  isReady: boolean;
  lastSentState: { x: number | null; y: number | null; flipX: boolean; time: number };
  conversationPeerIds: Set<string>;
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  player!: Phaser.Physics.Arcade.Sprite;
  selfLabel!: Phaser.GameObjects.Text;
  selfAura!: Phaser.GameObjects.Arc;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

  constructor() {
    super({ key: 'RoomScene' });
    this.selfSocketId = null;
    this.remotePlayers = new Map();
    this.onLocalPlayerMove = null;
    this.onSceneReady = null;
    this.isReady = false;
    this.lastSentState = { x: null, y: null, flipX: false, time: 0 };
    this.conversationPeerIds = new Set();
  }

  preload() {
    this.load.spritesheet(
      'tiles',
      '/kenney_roguelike-modern-city/Tilemap/tilemap_packed.png',
      { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE }
    );

    // Load character walk frames
    for (let i = 0; i < 8; i++) {
      this.load.image(
        `char_walk${i}`,
        `/character/character_malePerson_walk${i}.png`
      );
    }
  }

  create() {
    // Layer 1: Ground tiles (all walkable, no physics)
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (GROUND[r][c] === 0) continue;
        this.add.image(c * D, r * D, 'tiles', GROUND[r][c])
          .setOrigin(0, 0)
          .setScale(SCALE);
      }
    }

    PRIVATE_ZONES.forEach((zone) => {
      const fill = this.add
        .rectangle(zone.x, zone.y, zone.width, zone.height, zone.color, 0.1)
        .setOrigin(0)
        .setDepth(2);
      fill.setStrokeStyle(2, zone.color, 0.7);

      this.add
        .text(zone.x + 10, zone.y + 8, `PRIVATE · ${zone.name.toUpperCase()}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f8fafc',
          backgroundColor: '#111827cc',
          padding: { x: 7, y: 4 },
        })
        .setDepth(3);
    });

    // Layer 2: Object tiles (collision bodies)
    this.obstacles = this.physics.add.staticGroup();
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (OBJECTS[r][c] === 0) continue;
        const spr = this.obstacles.create(
          c * D + D / 2,
          r * D + D / 2,
          'tiles',
          OBJECTS[r][c]
        );
        spr.setScale(SCALE);
        spr.refreshBody();
      }
    }

    // Walk animation
    this.anims.create({
      key: 'walk',
      frames: Array.from({ length: 8 }, (_, i) => ({ key: `char_walk${i}` })),
      frameRate: 12,
      repeat: -1,
    });

    // Player character sprite
    // Original frame is 192x256, scale down to ~36x48 in game
    const charScale = D / 192 * 1.1; // slightly larger than a tile for visibility
    this.player = this.physics.add.sprite(
      5 * D + D / 2,
      5 * D + D / 2,
      'char_walk0'
    );
    this.player.setScale(charScale);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.selfLabel = this.createPlayerLabel(this.player, "You", true);
    this.selfAura = this.createConversationAura(this.player);

    // Shrink the collision body to a small box at the character's feet
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(
      Math.round(60 * charScale),
      Math.round(40 * charScale)
    );
    playerBody.setOffset(
      Math.round((192 - 60) / 2),
      Math.round(256 - 40)
    );

    // Collisions
    this.physics.add.collider(this.player, this.obstacles);

    // Input
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

    // Camera follows player, doesn't go outside world bounds
    this.cameras.main.setBounds(0, 0, W * D, H * D);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // World bounds
    this.physics.world.setBounds(0, 0, W * D, H * D);

    this.isReady = true;
    this.onSceneReady?.(this);

    this.events.once("shutdown", () => {
      this.isReady = false;
      this.remotePlayers.forEach((remotePlayer) => {
        remotePlayer.sprite.destroy();
        remotePlayer.label.destroy();
        remotePlayer.aura.destroy();
      });
      this.remotePlayers.clear();
    });
  }

  update() {
    const speed = 200;
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setVelocity(0);

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const moving = left || right || up || down;

    if (left) playerBody.setVelocityX(-speed);
    else if (right) playerBody.setVelocityX(speed);

    if (up) playerBody.setVelocityY(-speed);
    else if (down) playerBody.setVelocityY(speed);

    if ((left || right) && (up || down)) {
      playerBody.velocity.normalize().scale(speed);
    }

    // Walk animation
    if (moving) {
      if (!this.player.anims.isPlaying) this.player.anims.play('walk', true);
      if (left) this.player.setFlipX(true);
      else if (right) this.player.setFlipX(false);
    } else {
      this.player.anims.stop();
      this.player.setTexture('char_walk0');
    }

    this.remotePlayers.forEach((remotePlayer) => {
      remotePlayer.sprite.x = Phaser.Math.Linear(remotePlayer.sprite.x, remotePlayer.targetX, 0.35);
      remotePlayer.sprite.y = Phaser.Math.Linear(remotePlayer.sprite.y, remotePlayer.targetY, 0.35);

      const isRemoteMoving =
        Math.abs(remotePlayer.sprite.x - remotePlayer.targetX) > 1 ||
        Math.abs(remotePlayer.sprite.y - remotePlayer.targetY) > 1;

      if (isRemoteMoving) {
        if (!remotePlayer.sprite.anims.isPlaying) {
          remotePlayer.sprite.anims.play('walk', true);
        }
      } else {
        remotePlayer.sprite.anims.stop();
        remotePlayer.sprite.setTexture('char_walk0');
      }


      remotePlayer.label.setPosition(remotePlayer.sprite.x, remotePlayer.sprite.y - 35);
      remotePlayer.aura.setPosition(remotePlayer.sprite.x, remotePlayer.sprite.y + 2);
    });

    this.selfLabel?.setPosition(this.player.x, this.player.y - 35);
    this.selfAura?.setPosition(this.player.x, this.player.y + 2);

    this.emitLocalPlayerState();
  }

  setMovementEmitter(onLocalPlayerMove: (playerState: LocalPlayerState) => void) {
    this.onLocalPlayerMove = onLocalPlayerMove;
  }

  setReadyHandler(onSceneReady: (scene: RoomScene) => void) {
    this.onSceneReady = onSceneReady;

    if (this.isReady) {
      this.onSceneReady?.(this);
    }
  }

  createRemotePlayer(player: ScenePlayer) {
    if (!player?.socketId || player.socketId === this.selfSocketId || this.remotePlayers.has(player.socketId)) {
      return;
    }

    const charScale = D / 192 * 1.1;
    const sprite = this.add.sprite(player.x, player.y, 'char_walk0');
    sprite.setScale(charScale);
    sprite.setDepth(10);
    sprite.setFlipX(Boolean(player.flipX));

    const label = this.createPlayerLabel(sprite, player.displayName || "Guest");
    const aura = this.createConversationAura(sprite);

    this.remotePlayers.set(player.socketId, {
      sprite,
      label,
      aura,
      targetX: player.x,
      targetY: player.y,
    });
  }

  createPlayerLabel(
    sprite: Phaser.GameObjects.Components.Transform,
    displayName: string,
    isSelf = false,
  ) {
    return this.add
      .text(sprite.x, sprite.y - 35, isSelf ? `${displayName} · YOU` : displayName, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: '600',
        color: '#ffffff',
        backgroundColor: isSelf ? '#0f766ecc' : '#111827d9',
        padding: { x: 7, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(30);
  }

  createConversationAura(sprite: Phaser.GameObjects.Components.Transform) {
    return this.add
      .circle(sprite.x, sprite.y + 2, PROXIMITY_ENTER_DISTANCE, 0x67e8f9, 0.035)
      .setStrokeStyle(1, 0x67e8f9, 0.16)
      .setDepth(4)
      .setVisible(false);
  }

  setConversationPeers(peerIds: string[] = []) {
    this.conversationPeerIds = new Set(peerIds);
    this.selfAura?.setVisible(this.conversationPeerIds.size > 0);
    this.remotePlayers.forEach((remotePlayer, socketId) => {
      const isConnected = this.conversationPeerIds.has(socketId);
      remotePlayer.aura.setVisible(isConnected);
      remotePlayer.label.setStyle({
        backgroundColor: isConnected ? '#0e7490e6' : '#111827d9',
      });
    });
  }

  syncPlayers({ selfSocketId, players = [] }: PresenceState = {}) {
    if (!this.player) return;

    this.selfSocketId = selfSocketId || null;

    const activeRemoteIds = new Set<string>();

    players.forEach((player) => {
      if (player.socketId === this.selfSocketId) {
        this.player.setPosition(player.x, player.y);
        this.player.setFlipX(Boolean(player.flipX));
        this.selfLabel?.setText(`${player.displayName || "Guest"} · YOU`);
        this.lastSentState = {
          x: player.x,
          y: player.y,
          flipX: Boolean(player.flipX),
          time: 0,
        };
        return;
      }

      activeRemoteIds.add(player.socketId);

      if (!this.remotePlayers.has(player.socketId)) {
        this.createRemotePlayer(player);
      }

      const remotePlayer = this.remotePlayers.get(player.socketId);
      if (!remotePlayer) return;

      remotePlayer.sprite.x = player.x;
      remotePlayer.sprite.y = player.y;
      remotePlayer.targetX = player.x;
      remotePlayer.targetY = player.y;
      remotePlayer.sprite.setFlipX(Boolean(player.flipX));
      remotePlayer.label.setText(player.displayName || "Guest");
    });

    this.remotePlayers.forEach((remotePlayer, socketId) => {
      if (activeRemoteIds.has(socketId)) return;

      remotePlayer.sprite.destroy();
      remotePlayer.label.destroy();
      remotePlayer.aura.destroy();
      this.remotePlayers.delete(socketId);
    });
  }

  applyRemoteMove({ socketId, x, y, flipX }: PlayerMovedPayload) {
    if (!socketId || socketId === this.selfSocketId) return;

    if (!this.remotePlayers.has(socketId)) {
      this.createRemotePlayer({ socketId, x, y, flipX });
    }

    const remotePlayer = this.remotePlayers.get(socketId);
    if (!remotePlayer) return;

    remotePlayer.targetX = x;
    remotePlayer.targetY = y;
    remotePlayer.sprite.setFlipX(Boolean(flipX));
  }

  emitLocalPlayerState() {
    if (!this.onLocalPlayerMove || !this.selfSocketId || !this.player?.body) return;

    const now = this.time.now;
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const flipX = Boolean(this.player.flipX);
    const positionChanged =
      x !== this.lastSentState.x ||
      y !== this.lastSentState.y ||
      flipX !== this.lastSentState.flipX;

    if (!positionChanged) return;
    if (now - this.lastSentState.time < 50) return;

    this.onLocalPlayerMove({
      x,
      y,
      flipX,
    });

    this.lastSentState = { x, y, flipX, time: now };
  }
}
