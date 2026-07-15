# Phase 1: Spatial Conversation MVP

## Status

The basic requirements of the Phase 1 MVP are complete. It is implemented as a bounded peer-to-peer prototype intended for manual testing with up to four participants in one conversation group.

## User experience

- Each browser receives a stable guest identity unless an authenticated username is available.
- Names appear above local and remote avatars.
- Walking within 176 pixels of another avatar automatically starts a conversation.
- Connected conversations remain active until participants move more than 224 pixels apart. The separate enter and exit radii prevent connection flicker at the boundary.
- Moving into a private area disconnects the user from people outside it and connects them to other authorized occupants.
- A private-area occupant can lock the area. The people already inside remain members; newcomers are excluded until the owner unlocks it or leaves.
- The conversation dock shows current peers, video, device state, private-area state, and media errors.
- Users can mute their microphone, disable their camera, enter quiet mode, and share their screen.
- Audio volume decreases with distance in public proximity conversations. Private-area audio remains at full volume.

## Spatial contract

The server owns conversation membership. Clients send movement updates, but they cannot choose arbitrary media peers.

The server emits `conversation-state` with:

```js
{
  roomId,
  peers: PlayerPresence[],
  zone: {
    id,
    name,
    isLocked,
    isLockOwner,
    hasAccess
  } | null,
  deafened
}
```

WebRTC descriptions and ICE candidates are forwarded only when both sockets are current spatial peers.

## Prototype media architecture

Phase 1 uses a peer-to-peer WebRTC mesh capped at three remote peers per participant. This keeps the current repository self-contained and makes the four-browser acceptance flow testable.

This is a deliberate prototype boundary, not the production architecture. Before increasing room or conversation limits, replace the mesh with an SFU such as LiveKit or mediasoup. The server-owned `conversation-state` contract should remain the source of desired subscriptions after that migration.

## Private areas

Two private areas are currently defined in both the server and Phaser map configuration:

- Garden Nook
- Sunset Table

The duplicated configuration is acceptable for this slice but must move to a shared, data-driven map schema during the persistent-space or map-tooling work.

## Environment

The client reads optional WebRTC configuration from:

- `VITE_STUN_URLS`
- `VITE_TURN_URLS`
- `VITE_TURN_USERNAME`
- `VITE_TURN_CREDENTIAL`

Public STUN defaults are provided. A real TURN service is required before cross-network media reliability can be considered complete.

## Manual acceptance test

1. Start the server and client.
2. Open the same room in four separate browser profiles or devices.
3. Confirm that all four names and moving avatars remain synchronized.
4. Enable camera and microphone in each browser.
5. Walk two avatars together and confirm that media connects automatically.
6. Bring the other two avatars into range and confirm that the group expands without a call dialog.
7. Move one avatar beyond the exit radius and confirm that it disconnects without affecting the remaining group.
8. Move two avatars into Garden Nook and confirm that nearby outsiders cannot hear them.
9. Lock Garden Nook, attempt to enter with another avatar, and confirm that the newcomer is excluded.
10. Exercise mute, camera, quiet mode, and screen sharing.
11. Refresh or close a participant and confirm that no ghost participant remains.

## Known limitations and future improvements

The following items are not required for the Phase 1 MVP. They are future improvements for greater production reliability, maintainability, and scalability.

- A production TURN service still needs to be configured and verified across real networks.
- The four-browser flow needs automated browser coverage.
- Media-device selection and an explicit pre-entry device preview are not implemented yet.
- Collision validation remains client-oriented; the server currently validates world bounds and limits movement distance but does not understand the tile collision map.
- Private-zone definitions are duplicated between client and server.
- The media mesh must be replaced by an SFU before raising participant limits.
