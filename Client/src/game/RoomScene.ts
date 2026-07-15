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

const D = 32;

const W = 32;
const H = 22;

const OFFICE_ASSET_PATH = '/officeInteriorAssets';

interface OfficeArea {
  color: number;
  column: number;
  row: number;
  width: number;
  height: number;
}

interface OfficeWall {
  column: number;
  row: number;
  width: number;
  height: number;
}

interface OfficeLabel {
  text: string;
  column: number;
  row: number;
}

interface OfficeItem {
  texture: string;
  frame?: string;
  column: number;
  row: number;
  scale: number;
  depthOffset?: number;
  flipX?: boolean;
  rotation?: number;
  collision?: { width: number; height: number };
}

const FURNITURE_FRAMES = [
  { name: 'cabinet', x: 0, y: 458, width: 100, height: 182 },
  { name: 'cabinet-narrow', x: 120, y: 458, width: 40, height: 182 },
  { name: 'cabinet-alt', x: 180, y: 458, width: 100, height: 182 },
  { name: 'desk-horizontal', x: 160, y: 739, width: 201, height: 221 },
] as const;

const OFFICE_AREAS: OfficeArea[] = [
  // A small arrival area and one continuous open office floor.
  { column: 0.5, row: 0.5, width: 8.5, height: 11.5, color: 0xdccbae },
  { column: 9, row: 0.5, width: 22.5, height: 14, color: 0xcbd6dc },
  { column: 18.5, row: 14.5, width: 13, height: 7, color: 0xcbd6dc },
  { column: 0.5, row: 17.5, width: 9.5, height: 4, color: 0xcbd6dc },

  // Subtle desk-bank rugs create density without building extra rooms.
  { column: 10, row: 1.5, width: 20.5, height: 3.8, color: 0xb8c9d2 },
  { column: 10, row: 6, width: 20.5, height: 3.8, color: 0xc0ced6 },
  { column: 10, row: 10.5, width: 20.5, height: 3.5, color: 0xb8c9d2 },
  { column: 19.2, row: 15, width: 11.7, height: 6, color: 0xb8c9d2 },

  // The only two enclosed rooms.
  { column: 0.5, row: 12, width: 8.5, height: 5.5, color: 0xc8ddd6 },
  { column: 10, row: 14.5, width: 8.5, height: 7, color: 0xdfd3b8 },
];

const OFFICE_WALLS: OfficeWall[] = [
  // Outer shell, with a compact entrance beside the lower workstation bank.
  { column: 0, row: 0, width: 32, height: 0.45 },
  { column: 0, row: 21.55, width: 19, height: 0.45 },
  { column: 22, row: 21.55, width: 10, height: 0.45 },
  { column: 0, row: 0, width: 0.45, height: 22 },
  { column: 31.55, row: 0, width: 0.45, height: 22 },

  // Arrival area opens directly into the main office.
  { column: 8.8, row: 0, width: 0.35, height: 4.2 },
  { column: 8.8, row: 7, width: 0.35, height: 5 },

  // Focus room.
  { column: 0, row: 11.8, width: 3, height: 0.35 },
  { column: 6, row: 11.8, width: 3, height: 0.35 },
  { column: 8.8, row: 12, width: 0.35, height: 5.5 },
  { column: 0, row: 17.3, width: 3, height: 0.35 },
  { column: 6, row: 17.3, width: 3, height: 0.35 },

  // Boardroom, with a north-facing doorway into the open office.
  { column: 10, row: 14.3, width: 3, height: 0.35 },
  { column: 15.5, row: 14.3, width: 3, height: 0.35 },
  { column: 10, row: 14.3, width: 0.35, height: 7.7 },
  { column: 18.3, row: 14.3, width: 0.35, height: 7.7 },
];

const OFFICE_LABELS: OfficeLabel[] = [
  { text: 'WELCOME', column: 1.2, row: 1 },
  { text: 'OPEN OFFICE', column: 10, row: 0.9 },
];

const CHAIR_TEXTURES = [
  'office-chair-green-front',
  'office-chair-purple-front',
  'office-chair-yellow-front',
] as const;

const createWorkstation = (
  column: number,
  row: number,
  index: number,
): OfficeItem[] => [
  {
    texture: 'office-furniture',
    frame: 'desk-horizontal',
    column,
    row,
    scale: 0.32,
    collision: { width: 58, height: 32 },
  },
  {
    texture: 'office-computer-front',
    column: column - 0.12,
    row: row - 0.35,
    scale: 0.27,
    depthOffset: 0.5,
  },
  {
    texture: 'office-papers-graphs',
    column: column + 0.72,
    row: row - 0.2,
    scale: 0.14,
    depthOffset: 0.48,
  },
  {
    texture: CHAIR_TEXTURES[index % CHAIR_TEXTURES.length],
    column,
    row: row + 1.08,
    scale: 0.17,
    collision: { width: 20, height: 20 },
  },
];

const MAIN_WORKSTATIONS = [2.8, 7.3, 11.8].flatMap((row, rowIndex) =>
  [11.7, 13.85, 16, 18.15, 20.3, 22.45, 24.6, 26.75, 28.9].flatMap((column, columnIndex) =>
    createWorkstation(column, row, rowIndex * 9 + columnIndex),
  ),
);

const LOWER_WORKSTATIONS = [16.2, 19.4].flatMap((row, rowIndex) =>
  [22.6, 24.55, 26.5, 28.25, 30].flatMap((column, columnIndex) =>
    createWorkstation(column, row, 27 + rowIndex * 5 + columnIndex),
  ),
);

const OFFICE_ITEMS: OfficeItem[] = [
  // The arrival area doubles as a small workstation bank around a clear spawn aisle.
  ...createWorkstation(2.2, 2.4, 23),
  ...createWorkstation(4.4, 2.4, 24),
  ...createWorkstation(6.6, 2.4, 25),
  { texture: 'office-furniture', frame: 'desk-horizontal', column: 5, row: 9.2, scale: 0.38, collision: { width: 68, height: 36 } },
  { texture: 'office-computer-front', column: 4.9, row: 8.8, scale: 0.27, depthOffset: 0.5 },
  { texture: 'office-chair-green-front', column: 5, row: 10.4, scale: 0.18, collision: { width: 22, height: 22 } },
  { texture: 'office-window', column: 4.7, row: 0.8, scale: 0.28 },
  { texture: 'office-furniture', frame: 'cabinet', column: 1.2, row: 9.5, scale: 0.25, collision: { width: 25, height: 28 } },
  { texture: 'office-furniture', frame: 'cabinet-alt', column: 2.3, row: 9.5, scale: 0.25, collision: { width: 25, height: 28 } },

  // Fifteen close, open workstations fill the main office.
  ...MAIN_WORKSTATIONS,
  { texture: 'office-whiteboard', column: 27.3, row: 0.75, scale: 0.2 },
  { texture: 'office-furniture', frame: 'cabinet', column: 30.4, row: 12.5, scale: 0.24, collision: { width: 24, height: 28 } },

  // Focus room and boardroom align with the server-authoritative private zones.
  { texture: 'office-round-table', column: 5, row: 14.7, scale: 0.28, collision: { width: 46, height: 38 } },
  { texture: 'office-chair-green-side', column: 3.8, row: 14.7, scale: 0.17, collision: { width: 20, height: 20 } },
  { texture: 'office-chair-green-side', column: 6.2, row: 14.7, scale: 0.17, flipX: true, collision: { width: 20, height: 20 } },
  { texture: 'office-whiteboard', column: 5, row: 12.5, scale: 0.2 },
  { texture: 'office-round-table', column: 14.2, row: 18, scale: 0.4, collision: { width: 68, height: 56 } },
  { texture: 'office-chair-purple-side', column: 12.3, row: 18, scale: 0.18, collision: { width: 20, height: 20 } },
  { texture: 'office-chair-purple-side', column: 16.1, row: 18, scale: 0.18, flipX: true, collision: { width: 20, height: 20 } },
  { texture: 'office-chair-purple-back', column: 14.2, row: 20, scale: 0.18, collision: { width: 20, height: 20 } },
  { texture: 'office-chair-yellow-front', column: 14.2, row: 16, scale: 0.18, collision: { width: 20, height: 20 } },
  { texture: 'office-whiteboard', column: 17.5, row: 15.4, scale: 0.18 },

  // Eight more desks fill the lower floor instead of using a lounge or quiet room.
  ...LOWER_WORKSTATIONS,
  ...createWorkstation(3.1, 19.4, 21),
  ...createWorkstation(5.15, 19.4, 22),
  ...createWorkstation(7.2, 19.4, 23),
];

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
    this.load.image('office-floor', `${OFFICE_ASSET_PATH}/groundTile.png`);
    this.load.image('office-furniture', `${OFFICE_ASSET_PATH}/furnitureTile.png`);
    this.load.image('office-computer-front', `${OFFICE_ASSET_PATH}/computerFullFront.png`);
    this.load.image('office-round-table', `${OFFICE_ASSET_PATH}/roundTable.png`);
    this.load.image('office-stool', `${OFFICE_ASSET_PATH}/stool.png`);
    this.load.image('office-whiteboard', `${OFFICE_ASSET_PATH}/whiteboard.png`);
    this.load.image('office-coffee-machine', `${OFFICE_ASSET_PATH}/coffeeMachine.png`);
    this.load.image('office-window', `${OFFICE_ASSET_PATH}/window.png`);
    this.load.image('office-papers-graphs', `${OFFICE_ASSET_PATH}/papersGraphs.png`);

    for (const color of ['Green', 'Purple', 'Yellow']) {
      for (const direction of ['Back', 'Front', 'Side']) {
        this.load.image(
          `office-chair-${color.toLowerCase()}-${direction.toLowerCase()}`,
          `${OFFICE_ASSET_PATH}/wheelChair${color}${direction}.png`,
        );
      }
    }

    // Load character walk frames
    for (let i = 0; i < 8; i++) {
      this.load.image(
        `char_walk${i}`,
        `/character/character_malePerson_walk${i}.png`
      );
    }
  }

  registerFurnitureFrames() {
    const texture = this.textures.get('office-furniture');

    FURNITURE_FRAMES.forEach((frame) => {
      if (texture.has(frame.name)) return;

      texture.add(
        frame.name,
        0,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
      );
    });
  }

  addStaticCollider(x: number, y: number, width: number, height: number) {
    const collider = this.add
      .rectangle(x, y, width, height, 0x000000, 0)
      .setVisible(false);
    this.physics.add.existing(collider, true);
    this.obstacles.add(collider);
  }

  addOfficeWall(wall: OfficeWall) {
    const x = wall.column * D;
    const y = wall.row * D;
    const width = wall.width * D;
    const height = wall.height * D;

    this.add
      .rectangle(x, y, width, height, 0x574c4d)
      .setOrigin(0)
      .setDepth(5);

    const inset = Math.min(4, width / 4, height / 4);
    this.add
      .rectangle(
        x + inset,
        y + inset,
        Math.max(1, width - inset * 2),
        Math.max(1, height - inset * 2),
        0xe7ddd0,
      )
      .setOrigin(0)
      .setDepth(5.1);

    this.addStaticCollider(x + width / 2, y + height / 2, width, height);
  }

  addOfficeItem(item: OfficeItem) {
    const image = this.add
      .image(
        item.column * D + D / 2,
        item.row * D + D / 2,
        item.texture,
        item.frame,
      )
      .setScale(item.scale)
      .setFlipX(Boolean(item.flipX))
      .setRotation(item.rotation ?? 0)
      .setDepth(6 + item.row / 100 + (item.depthOffset ?? 0));

    if (item.collision) {
      this.addStaticCollider(
        image.x,
        image.y,
        item.collision.width,
        item.collision.height,
      );
    }
  }

  createOfficeEnvironment() {
    this.registerFurnitureFrames();

    this.add
      .tileSprite(0, 0, W * D, H * D, 'office-floor')
      .setOrigin(0)
      .setDepth(0);

    OFFICE_AREAS.forEach((area) => {
      const room = this.add
        .rectangle(
          area.column * D,
          area.row * D,
          area.width * D,
          area.height * D,
          area.color,
          0.66,
        )
        .setOrigin(0)
        .setDepth(1);
      room.setStrokeStyle(1, 0xffffff, 0.35);
    });

    this.obstacles = this.physics.add.staticGroup();
    OFFICE_WALLS.forEach((wall) => this.addOfficeWall(wall));

    OFFICE_LABELS.forEach((label) => {
      this.add
        .text(label.column * D, label.row * D, label.text, {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: '700',
          color: '#4f4544',
          backgroundColor: '#fffaf0c7',
          padding: { x: 7, y: 4 },
        })
        .setDepth(7);
    });

    OFFICE_ITEMS.forEach((item) => this.addOfficeItem(item));
  }

  create() {
    this.createOfficeEnvironment();

    PRIVATE_ZONES.forEach((zone) => {
      const fill = this.add
        .rectangle(zone.x, zone.y, zone.width, zone.height, zone.color, 0.1)
        .setOrigin(0)
        .setDepth(3);
      fill.setStrokeStyle(2, zone.color, 0.7);

      this.add
        .text(zone.x + 10, zone.y + 8, `PRIVATE · ${zone.name.toUpperCase()}`, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#f8fafc',
          backgroundColor: '#111827cc',
          padding: { x: 7, y: 4 },
        })
        .setDepth(8);
    });

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
      4 * D + D / 2,
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
