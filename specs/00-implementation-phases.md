# Gathermeet Implementation Phases

## Purpose

Gathermeet is a spatial collaboration application inspired by Gather. The product should let people enter a persistent virtual office, move through a shared 2D world, naturally join nearby conversations, use private meeting areas, and collaborate without relying on conventional meeting links.

This document is the high-level implementation roadmap. Each phase should result in a usable, manually testable product increment. Detailed technical specifications can be added as separate documents in this folder before each phase begins.

## Product principles

- Spatial presence and proximity-based conversation are the core product loop.
- Build a focused, reliable virtual-office experience before adding broad workplace integrations.
- Keep game presence, persistent application data, and realtime media as separate architectural concerns.
- Prefer persistent workspaces over temporary room codes.
- Make each phase independently testable with multiple real browser sessions.
- Treat permissions, reconnect behavior, and failure states as product features rather than final-stage cleanup.

## Phase 0: Foundation and architecture

### Goal

Create a clean project foundation that can support a multiplayer game client, persistent backend, realtime presence, and production media infrastructure.

### Scope

- Select and document the client, server, database, realtime, and media stack.
- Create the repository structure and local development workflow.
- Add environment-variable validation and example configuration.
- Establish formatting, linting, tests, and CI.
- Define the initial domain model for users, workspaces, spaces, maps, memberships, and invitations.
- Define shared contracts for player presence and socket events.
- Decide how map data, collision data, zones, spawn points, and interactive objects are represented.
- Add basic authentication and protected application routes.
- Add structured logging, health checks, and consistent error handling.

### Completion criteria

- A new developer can start the client, server, database, and required realtime services locally.
- Authentication works end to end.
- Socket connections can be authenticated.
- Shared contracts prevent the client and server event formats from drifting.
- CI runs linting, type checks, and the initial test suite.

## Phase 1: Spatial conversation MVP

### Goal

Deliver the defining Gather-like experience: users walk around a shared 2D environment and naturally enter or leave conversations based on proximity or private-area membership.

### Scope

#### Shared world

- Render a polished 2D office map.
- Support keyboard movement and click-to-move if appropriate.
- Implement collision, spawn points, camera following, and remote-player interpolation.
- Synchronize joins, leaves, movement, direction, and animation state.
- Display stable user identities and names above avatars.
- Handle disconnects, reconnects, duplicate sessions, and stale presence.
- Validate movement on the server sufficiently to reject invalid coordinates and obvious teleporting.

#### Proximity system

- Calculate nearby participants from player positions.
- Define conversation enter and exit thresholds with hysteresis to avoid rapid connection switching.
- Automatically update conversation membership as users move.
- Attenuate audio based on distance where appropriate.
- Show which nearby people can hear each other.
- Let users deafen themselves or opt out of nearby conversations.

#### Private areas

- Define private meeting zones in map data.
- Detect zone entry and exit.
- Connect everyone inside the same zone regardless of small positional differences.
- Isolate the conversation from users outside the zone.
- Show the zone name and current participants.
- Add a basic lock and unlock flow for authorized participants.

#### Media controls

- Support microphone and camera permissions with a pre-join device check.
- Add mute, unmute, camera, deafen, and leave-conversation controls.
- Show local and remote video tiles without obscuring the spatial world.
- Add basic screen sharing.
- Configure STUN and TURN for connections outside the local network.
- Use an SFU-backed media architecture, or establish a tightly bounded peer-to-peer prototype with a documented migration point.

### Completion criteria

- At least four users can enter the same space from separate browser sessions.
- Users can naturally form, merge, and leave nearby conversations without pressing a Call button.
- A private meeting area correctly isolates its participants.
- Audio, video, mute, deafen, and screen sharing work across real networks.
- Reconnecting does not leave ghost participants behind.

## Phase 2: Persistent virtual offices

### Goal

Turn temporary rooms into persistent, owned virtual offices that teams can return to every day.

### Scope

- Create persistent workspace, space, map, membership, role, and invitation records.
- Give spaces stable, human-readable URLs or slugs.
- Support owners, admins, members, and guests.
- Add email or link-based invitations.
- Enforce workspace membership in HTTP routes and socket connections.
- Store space configuration and map selection.
- Store a user's last valid position and preferred spawn location.
- Add an office lobby with recent and joined workspaces.
- Add member directories and basic participant search.
- Add availability states such as available, busy, focused, and away.
- Add presence indicators for microphone, camera, conversation, and meeting state.
- Add locate, follow, or navigate-to-teammate actions.
- Support assigned desks or personal home positions.

### Completion criteria

- A team can create and name an office, invite members, and control guest access.
- The office and its configuration survive server restarts and deployments.
- Users return to the correct office and an appropriate saved or assigned location.
- Unauthorized users cannot read, enter, or subscribe to a private workspace.
- Teammates can understand one another's location and availability at a glance.

## Phase 3: Social and collaboration layer

### Goal

Make Gathermeet useful for synchronous and asynchronous team collaboration without leaving the virtual office.

### Scope

#### Messaging

- Add persistent workspace chat.
- Add nearby or current-conversation chat.
- Add direct messages and group messages.
- Add public and private channels.
- Add threads, unread state, mentions, and recent activity.
- Add emoji reactions and basic file attachments.
- Apply permissions, validation, rate limits, and moderation controls.

#### Meetings and collaboration

- Add a dedicated meeting view when a conversation needs more screen space.
- Support meeting chat and participant management.
- Improve simultaneous screen sharing if supported by the media stack.
- Add an interactive whiteboard or embedded collaborative document.
- Add interactive media objects such as presentation screens, videos, and external links.
- Add lightweight social actions such as waving, emoji bubbles, dancing, and confetti.
- Add useful in-app and browser notifications.

### Completion criteria

- Users can continue a conversation through persistent chat before and after meeting live.
- DMs, channels, threads, unread state, and permissions work reliably.
- A meeting can include screen sharing and at least one interactive collaboration surface.
- Social interactions enrich the office without interfering with movement or media controls.

## Phase 4: Space customization and map tools

### Goal

Let workspace administrators create an office that reflects their team without editing source code.

### Scope

- Move maps into a versioned, data-driven format such as Tiled JSON or an equivalent schema.
- Support tile, collision, foreground, zone, spawn, portal, and object layers.
- Provide several office templates for different team sizes.
- Build an object catalog with searchable categories.
- Let authorized users place, move, rotate, configure, and delete objects.
- Let admins create and edit private areas, spawn points, team areas, and portals.
- Support decorative and interactive objects.
- Allow custom logos, images, room labels, and workspace branding.
- Add desks that members can claim, be assigned, and personalize.
- Add draft, preview, publish, and rollback behavior for map changes.
- Validate map updates so published spaces remain navigable.

### Completion criteria

- An admin can create a usable office from a template without editing code.
- Objects, zones, portals, and spawn points can be edited safely.
- Map changes can be previewed before publication and rolled back afterward.
- Existing occupants receive published map changes without corrupting their session.

## Phase 5: Production scale, reliability, and polish

### Goal

Make Gathermeet reliable, secure, observable, and comfortable for daily team use.

### Scope

#### Scale and reliability

- Use an SFU suitable for multi-participant spatial media.
- Scale Socket.IO or the selected presence service across instances using Redis or an equivalent adapter.
- Add durable session recovery and presence cleanup.
- Add database indexes, caching, queues, and background jobs where measurements justify them.
- Add media quality adaptation, bandwidth controls, and participant limits.
- Add graceful degradation for weak networks and unavailable devices.
- Add metrics, tracing, error reporting, dashboards, and alerts.

#### Security and administration

- Validate and authorize every HTTP and socket operation.
- Add rate limiting, payload limits, abuse prevention, and audit logs.
- Add admin controls for removing, muting, blocking, and reporting users.
- Review secrets, uploads, content security policy, CORS, and data retention.
- Add backup, restore, migration, and disaster-recovery procedures.

#### Product polish

- Build a clear first-run and device-permission onboarding flow.
- Add keyboard shortcut help and command search.
- Add accessible controls, focus behavior, labels, contrast, and reduced-motion support.
- Add responsive layouts and a simplified view for smaller screens.
- Improve loading, empty, reconnecting, permission-denied, and offline states.
- Add browser compatibility checks and automated end-to-end multiplayer testing.
- Measure client performance, memory usage, battery usage, and network consumption.

### Completion criteria

- The system meets documented concurrency and media-quality targets.
- Multiple application instances share presence correctly.
- Operational failures are observable and recoverable.
- The critical user flows have automated browser and multiplayer coverage.
- Security, accessibility, and performance reviews have no unresolved launch blockers.

## Future product extensions

These features should be considered only after the core spatial office is stable and teams are using it regularly:

- Calendar scheduling and calendar-status synchronization.
- Meeting recordings.
- Meeting transcription and AI-generated notes.
- Coworking and focus sessions.
- Workspace activity and collaboration insights.
- GitHub, design-tool, music, and productivity integrations.
- Desktop mini mode and operating-system presence controls.
- Multiple connected floors or buildings.
- Events, games, vehicles, and larger social spaces.
- Enterprise SSO, provisioning, compliance, and retention controls.

## Recommended delivery sequence

1. Complete Phase 0 before expanding product scope.
2. Treat Phase 1 as the first true product milestone.
3. Validate the spatial conversation loop with real users before building the editor or advanced messaging.
4. Complete Phase 2 before promising persistent team-office workflows.
5. Add Phase 3 and Phase 4 incrementally based on observed team usage.
6. Work on Phase 5 throughout development, with a dedicated hardening milestone before broader release.

## Specification workflow

Before implementing a phase:

1. Create a focused specification for that phase in this folder.
2. Define user flows, data contracts, socket events, failure states, and explicit non-goals.
3. Break the phase into small, manually testable milestones.
4. Record architectural decisions that affect later phases.
5. Update this roadmap only when the overall product sequence changes.
