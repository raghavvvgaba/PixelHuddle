import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import RoomScene from './RoomScene';

const GAME_WIDTH = 40 * 32;  // 1280px (40 tiles x 32px)
const GAME_HEIGHT = 30 * 32; // 960px (30 tiles x 32px)

export default function PhaserGame({
  selfSocketId,
  players,
  onLocalPlayerMove,
  subscribeToRemoteMoves,
  conversationPeerIds,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const sceneRef = useRef(null);
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
        arcade: { gravity: { y: 0 }, debug: false },
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
