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

// Verified frame indices from Kenney's packed 37 x 28 tilesheet.
// Keep these names tied to what the frame actually contains; the pack only
// provides numeric filenames, so guessed indices quickly turn into visual noise.
const T = {
  GRASS: 962,
  GRASS_LIGHT: 888,
  SIDEWALK: 703,
  PLAZA: 706,
  ASPHALT: 714,
  ROAD_DASH: 712,
  ROAD_DASH_VERTICAL: 749,
  RED_ROOF: 40,
  GRAY_ROOF: 46,
  BEIGE_ROOF: 64,
  RED_WINDOWS: [148, 149, 150, 151],
  GRAY_WINDOWS: [152, 153, 154, 155],
  BEIGE_WINDOWS: [156, 157, 158, 159],
  RED_BRICKS: [185, 186, 187, 188],
  GRAY_BRICKS: [189, 190, 191, 192],
  BEIGE_BRICKS: [193, 194, 195, 196],
  GLASS_DOOR_LEFT: 160,
  GLASS_DOOR_RIGHT: 161,
  GREEN_AWNING: [393, 394, 395, 396],
  ORANGE_AWNING: [397, 398, 399, 400],
  WATER_TOP_LEFT: 174,
  WATER_TOP_RIGHT: 175,
  WATER_BOTTOM_LEFT: 211,
  WATER_BOTTOM_RIGHT: 212,
  CAR_GREEN_RIGHT: [660, 661, 662],
  CAR_GRAY_LEFT: [774, 775, 776, 811, 812, 813],
  CAR_ORANGE_LEFT: [922, 923, 924, 959, 960, 961],
  ARMCHAIR: 567,
  SIDE_TABLE: 568,
  LOW_TABLE: 569,
  BENCH: 570,
  COUNTER_MIDDLE: 606,
  COUNTER_LONG: 607,
  VENDING_MACHINE: 604,
  PLANT_LIGHT: 401,
  PLANT_DARK: 403,
  STREET_LIGHT: 481,
  STREET_LIGHT_ALT: 500,
  TRASH_CAN: 530,
  HYDRANT: 533,
  TRAFFIC_CONE: 680,
  ROOF_VENT: 144,
  ROOF_UNIT: 146,
};

const TILE_SIZE = 16;
const SCALE = 2;
const D = TILE_SIZE * SCALE; // 32px display

const W = 40; // grid width
const H = 30; // grid height

interface AreaLabel {
  text: string;
  column: number;
  row: number;
}

const AREA_LABELS: AreaLabel[] = [
  { text: "STUDENT COMMONS", column: 10, row: 2 },
  { text: "MAKER HALL", column: 27, row: 2 },
  { text: "CAMPUS CAFE", column: 28, row: 17 },
  { text: "PROJECT HOUSE", column: 3, row: 23 },
];

// --- Build a compact campus block from connected architectural tile sets. ---
function buildMaps() {
  const ground = Array.from({ length: H }, () => Array(W).fill(0));
  const decor = Array.from({ length: H }, () => Array(W).fill(0));
  const objects = Array.from({ length: H }, () => Array(W).fill(0));

  const fillRect = (
    layer: number[][],
    r0: number,
    r1: number,
    c0: number,
    c1: number,
    tile: number,
  ) => {
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        layer[r][c] = tile;
  };

  const patternedRow = (
    layer: number[][],
    row: number,
    c0: number,
    c1: number,
    tiles: readonly number[],
  ) => {
    for (let c = c0; c <= c1; c++) layer[row][c] = tiles[(c - c0) % tiles.length];
  };

  const buildFacade = (
    c0: number,
    c1: number,
    roofRows: [number, number],
    windowRow: number,
    brickRow: number,
    roofTile: number,
    windows: readonly number[],
    bricks: readonly number[],
  ) => {
    fillRect(objects, roofRows[0], roofRows[1], c0, c1, roofTile);
    patternedRow(objects, windowRow, c0, c1, windows);
    patternedRow(objects, brickRow, c0, c1, bricks);
  };

  const placeCar = (
    row: number,
    column: number,
    frames: readonly number[],
  ) => {
    for (let offset = 0; offset < 3; offset++) {
      objects[row][column + offset] = frames[offset];
      if (frames.length === 6) {
        objects[row + 1][column + offset] = frames[offset + 3];
      }
    }
  };

  fillRect(ground, 0, H - 1, 0, W - 1, T.GRASS);

  // Complete north-side building footprints. Keeping them inside the map gives
  // each one a readable roof, facade, entrance, and sidewalk on multiple sides.
  fillRect(ground, 0, 7, 0, W - 1, T.SIDEWALK);
  fillRect(ground, 1, 7, 0, 7, T.PLAZA);

  buildFacade(8, 20, [1, 4], 5, 6, T.RED_ROOF, T.RED_WINDOWS, T.RED_BRICKS);
  patternedRow(objects, 7, 8, 20, T.RED_BRICKS);
  patternedRow(objects, 7, 9, 12, T.GREEN_AWNING);
  patternedRow(objects, 7, 16, 19, T.ORANGE_AWNING);
  objects[7][13] = T.GLASS_DOOR_LEFT;
  objects[7][14] = T.GLASS_DOOR_RIGHT;
  decor[2][18] = T.ROOF_VENT;
  decor[3][10] = T.ROOF_UNIT;

  buildFacade(24, 38, [1, 4], 5, 6, T.GRAY_ROOF, T.GRAY_WINDOWS, T.GRAY_BRICKS);
  patternedRow(objects, 7, 24, 38, T.GRAY_BRICKS);
  patternedRow(objects, 7, 25, 28, T.GREEN_AWNING);
  objects[7][30] = T.GLASS_DOOR_LEFT;
  objects[7][31] = T.GLASS_DOOR_RIGHT;
  decor[2][36] = T.ROOF_VENT;
  decor[3][26] = T.ROOF_UNIT;

  // The west plaza is the open spawn point; all server spawn offsets remain clear.
  objects[1][1] = T.STREET_LIGHT;
  objects[6][1] = T.STREET_LIGHT_ALT;
  objects[1][6] = T.BENCH;
  objects[6][7] = T.TRASH_CAN;
  objects[6][22] = T.BENCH;
  objects[6][39] = T.STREET_LIGHT;

  // A two-lane avenue and a vertical cross street form a real city intersection.
  fillRect(ground, 8, 12, 0, W - 1, T.ASPHALT);
  fillRect(ground, 8, H - 1, 18, 22, T.ASPHALT);
  for (let c = 0; c < W; c += 2) {
    if (c < 18 || c > 22) decor[10][c] = T.ROAD_DASH;
  }
  for (let r = 14; r < H; r += 2) decor[r][20] = T.ROAD_DASH_VERTICAL;

  placeCar(8, 2, T.CAR_GREEN_RIGHT);
  placeCar(11, 10, T.CAR_ORANGE_LEFT);
  placeCar(8, 31, T.CAR_GRAY_LEFT);

  fillRect(ground, 13, 13, 0, 17, T.SIDEWALK);
  fillRect(ground, 13, 13, 23, 39, T.SIDEWALK);
  fillRect(ground, 13, H - 1, 17, 17, T.SIDEWALK);
  fillRect(ground, 13, H - 1, 23, 23, T.SIDEWALK);
  objects[13][3] = T.TRAFFIC_CONE;
  objects[13][15] = T.TRASH_CAN;
  objects[13][25] = T.TRAFFIC_CONE;
  objects[13][38] = T.TRASH_CAN;

  // The courtyard is a small park with two crossing paths. The private zones
  // stay open and readable rather than being buried under furniture.
  fillRect(ground, 14, 21, 0, 16, T.GRASS_LIGHT);
  fillRect(ground, 14, 21, 8, 9, T.PLAZA);
  fillRect(ground, 18, 19, 0, 16, T.PLAZA);
  fillRect(ground, 16, 18, 11, 15, T.PLAZA);

  [[14, 1], [14, 8], [16, 1], [16, 8], [20, 1], [20, 16]]
    .forEach(([r, c], index) => {
      objects[r][c] = index % 2 === 0 ? T.PLANT_LIGHT : T.PLANT_DARK;
    });
  objects[15][3] = T.BENCH;
  objects[15][7] = T.BENCH;
  objects[17][12] = T.ARMCHAIR;
  objects[17][15] = T.ARMCHAIR;
  objects[18][13] = T.COUNTER_MIDDLE;
  objects[18][14] = T.COUNTER_LONG;
  objects[20][3] = T.WATER_TOP_LEFT;
  objects[20][4] = T.WATER_TOP_RIGHT;
  objects[21][3] = T.WATER_BOTTOM_LEFT;
  objects[21][4] = T.WATER_BOTTOM_RIGHT;
  objects[20][11] = T.BENCH;
  objects[20][14] = T.BENCH;

  // Project House is a complete freestanding building below the courtyard.
  fillRect(ground, 22, 29, 0, 16, T.SIDEWALK);
  buildFacade(1, 15, [22, 25], 26, 27, T.BEIGE_ROOF, T.BEIGE_WINDOWS, T.BEIGE_BRICKS);
  patternedRow(objects, 28, 1, 15, T.BEIGE_BRICKS);
  patternedRow(objects, 28, 3, 6, T.GREEN_AWNING);
  objects[28][10] = T.GLASS_DOOR_LEFT;
  objects[28][11] = T.GLASS_DOOR_RIGHT;
  decor[23][13] = T.ROOF_VENT;
  decor[24][3] = T.ROOF_UNIT;

  // The cafe has the same architectural depth plus a paved terrace in front.
  fillRect(ground, 14, 29, 24, 39, T.SIDEWALK);
  buildFacade(25, 38, [16, 20], 21, 22, T.RED_ROOF, T.RED_WINDOWS, T.RED_BRICKS);
  patternedRow(objects, 23, 25, 38, T.RED_BRICKS);
  patternedRow(objects, 23, 26, 29, T.GREEN_AWNING);
  patternedRow(objects, 23, 33, 36, T.ORANGE_AWNING);
  objects[23][30] = T.GLASS_DOOR_LEFT;
  objects[23][31] = T.GLASS_DOOR_RIGHT;
  decor[17][36] = T.ROOF_VENT;
  decor[18][27] = T.ROOF_UNIT;

  fillRect(ground, 24, 29, 24, 39, T.PLAZA);
  [[26, 27], [26, 34], [28, 29], [28, 36]].forEach(([r, c]) => {
    objects[r][c] = T.SIDE_TABLE;
    objects[r][c - 1] = T.ARMCHAIR;
    objects[r][c + 1] = T.ARMCHAIR;
  });
  objects[25][24] = T.STREET_LIGHT;
  objects[25][39] = T.PLANT_DARK;
  objects[29][24] = T.TRASH_CAN;
  objects[29][39] = T.STREET_LIGHT_ALT;

  return { ground, decor, objects };
}

const { ground: GROUND, decor: DECOR, objects: OBJECTS } = buildMaps();

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

    // Layer 2: visual details that should not block player movement.
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (DECOR[r][c] === 0) continue;
        this.add.image(c * D, r * D, 'tiles', DECOR[r][c])
          .setOrigin(0, 0)
          .setScale(SCALE)
          .setDepth(1);
      }
    }

    AREA_LABELS.forEach((label) => {
      this.add
        .text(label.column * D, label.row * D, label.text, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#f8fafc',
          backgroundColor: '#111827b8',
          padding: { x: 6, y: 3 },
        })
        .setDepth(3);
    });

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

    // Layer 3: walls and furniture with collision bodies.
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
