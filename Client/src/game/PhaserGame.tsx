import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import RoomScene from './RoomScene';
import type { Player, PlayerMovedPayload } from '../../../Shared/realtime';

const GAME_WIDTH = 32 * 32;
const GAME_HEIGHT = 22 * 32;

interface LocalPlayerState {
  x: number;
  y: number;
  flipX: boolean;
}

interface PhaserGameProps {
  selfSocketId: string | null;
  players: Player[];
  onLocalPlayerMove: (playerState: LocalPlayerState) => void;
  subscribeToRemoteMoves: (listener: (move: PlayerMovedPayload) => void) => () => void;
  conversationPeerIds: string[];
}

export default function PhaserGame({
  selfSocketId,
  players,
  onLocalPlayerMove,
  subscribeToRemoteMoves,
  conversationPeerIds,
}: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const sceneReadyRef = useRef(false);
  const onLocalPlayerMoveRef = useRef(onLocalPlayerMove);
  const latestPresenceRef = useRef({
    selfSocketId,
    players,
  });

  useEffect(() => {
    latestPresenceRef.current = {
      selfSocketId,
      players,
    };
  }, [players, selfSocketId]);

  useEffect(() => {
    sceneRef.current?.setConversationPeers(conversationPeerIds || []);
  }, [conversationPeerIds]);

  useEffect(() => {
    onLocalPlayerMoveRef.current = onLocalPlayerMove;

    if (sceneRef.current) {
      sceneRef.current.setMovementEmitter((playerState) => {
        onLocalPlayerMoveRef.current?.(playerState);
      });
    }
  }, [onLocalPlayerMove]);

  useEffect(() => {
    if (gameRef.current) {
      return undefined;
    }

    const roomScene = new RoomScene();
    sceneRef.current = roomScene;
    roomScene.setMovementEmitter((playerState) => {
      onLocalPlayerMoveRef.current?.(playerState);
    });
    roomScene.setReadyHandler((scene) => {
      sceneReadyRef.current = true;
      scene.syncPlayers(latestPresenceRef.current);
    });

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundColor: '#0f0f1a',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: [roomScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      pixelArt: true,
      input: {
        keyboard: { target: window },
      },
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
        sceneReadyRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !sceneReadyRef.current) return;

    sceneRef.current.syncPlayers({
      selfSocketId,
      players,
    });
  }, [players, selfSocketId]);

  useEffect(() => {
    if (!subscribeToRemoteMoves) return undefined;

    return subscribeToRemoteMoves((move) => {
      if (!sceneReadyRef.current) return;
      sceneRef.current?.applyRemoteMove(move);
    });
  }, [subscribeToRemoteMoves]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
