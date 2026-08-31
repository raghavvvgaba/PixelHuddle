# Phase 2: Persistent Virtual Offices

## Status

Implemented as a focused learning-project milestone.

Persistent offices, memberships, invitation links, HTTP authorization, and Socket.IO membership enforcement are implemented. Offices use the existing map and default spawn; live player and media state remains intentionally in memory.

## Authentication foundation

Before persistent offices are introduced, the existing credentials authentication is enforced across the current application flow:

- Restored browser sessions are validated against the protected profile endpoint.
- Dashboard and room routes require a signed-in user.
- Successful login or signup returns the user to the originally requested protected route.
- Socket.IO connects with the JWT and rejects missing, invalid, or expired sessions.
- Realtime player identity comes from the verified JWT instead of client-supplied user data.
- Logging out disconnects the authenticated socket.

Manual check:

1. Open `/dashboard` while signed out and confirm the app redirects to `/login`.
2. Sign in and confirm the app returns to `/dashboard`.
3. Open a direct protected office or invitation link while signed out, sign in, and confirm the app returns to that route.
4. Refresh a protected page with a valid stored session and confirm it remains accessible after server validation.
5. Remove or invalidate the token and confirm protected pages and Socket.IO access are rejected.

## Goal

Replace temporary room codes with persistent offices that signed-in users can create, revisit, and share with invited members.

Phase 2 should remain a small extension of the existing Phase 1 experience. It adds durable office identity and simple access control while reusing the current map, spawn point, Phaser world, Socket.IO presence, and spatial conversation behavior.

## User roles

Phase 2 has only two roles:

- **Admin:** the user who creates the office.
- **Member:** a signed-in user who accepts an invitation to the office.

Each office has one admin. Phase 2 does not support additional admins, ownership transfer, role promotion, role demotion, or guest access.

The admin can:

- Open the office.
- Create invitation links.
- See the office on their dashboard.

A member can:

- Open an office they have joined.
- See joined offices on their dashboard.

## User experience

### Create an office

1. A signed-in user opens the dashboard.
2. They enter an office name and create it.
3. The server stores the office and creates the creator's membership.
4. The office appears on the dashboard.
5. Opening it uses `/offices/:officeSlug` and loads the existing spatial world.

The dashboard shows loading, empty, creation, and database-error states. Office creation is independent of the current Socket.IO connection state.

### Invite a member

1. The admin creates a copyable invitation link.
2. Another signed-in user opens the link.
3. The server validates the invitation and creates the invited user's membership.
4. The user is redirected to the office.
5. The office then appears on that member's dashboard.

Email delivery is not included. The admin copies and shares the link manually.

### Return to an office

The dashboard loads office memberships from MongoDB. Offices therefore remain available after refreshing the browser or restarting the server.

## Scope

- Store offices in MongoDB.
- Store office memberships in MongoDB.
- Generate a stable, unique office slug on the server.
- Add authenticated endpoints to create, list, and read offices.
- Show joined offices and a create-office form on the dashboard.
- Add the `/offices/:officeSlug` route.
- Use the office database ID as the Socket.IO room key.
- Add copyable, expiring invitation links.
- Let signed-in users accept invitations.
- Authenticate Socket.IO connections with the existing JWT.
- Verify office membership before joining an office's Socket.IO room.
- Keep the existing map, default spawn, movement, and spatial conversation behavior.

## Explicit non-goals

- Guest access.
- More than one admin per office.
- Ownership transfer or role changes.
- Removing or banning members.
- Multiple spaces, floors, or maps per office.
- Map selection, editing, or persistent map configuration.
- Saved player positions or preferred spawn points.
- Assigned or personal desks.
- Member directory and search.
- Availability states.
- Microphone, camera, meeting, or conversation indicators outside the existing room UI.
- Locate or follow teammate actions.
- Email invitations.
- Migrating old temporary `/room/:roomId` links into offices.

## Data model

Phase 2 needs three small referenced collections.

### Office

```ts
interface Office {
  _id: ObjectId;
  name: string;
  slug: string;
  adminId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

Rules:

- `slug` is lowercase, URL-safe, globally unique, and immutable.
- `name` can be changed later without changing the slug.
- `adminId` is the user who created the office.
- The admin must also have a membership for the office.

### Membership

```ts
interface Membership {
  _id: ObjectId;
  officeId: ObjectId;
  userId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

Rules:

- `{ officeId, userId }` is unique.
- Creating an office also creates the creator's membership.
- Accepting an invitation creates the invited user's membership.
- The API derives the role: the user is `admin` when their ID matches `Office.adminId`; every other member is `member`.
- Role state is not duplicated on membership documents.

### Invitation

```ts
interface Invitation {
  _id: ObjectId;
  officeId: ObjectId;
  createdBy: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  acceptedBy?: ObjectId;
  acceptedAt?: Date;
  createdAt: Date;
}
```

Rules:

- Only the office admin can create an invitation.
- Each invitation is single-use and creates a `member` membership.
- Only a hash of the invitation token is stored in MongoDB.
- Invitations expire after a fixed period, initially seven days.
- An expired or already accepted invitation cannot be used.
- If an existing member opens a valid invitation, the server redirects them to the office without creating a duplicate membership.

## Stable slug policy

The server creates a slug from the office name:

- `Computer Science Lab` becomes `computer-science-lab` when available.
- If that slug already exists, the server appends a short suffix such as `computer-science-lab-k7p4`.
- Renaming an office later does not change its slug.

The public URL uses the slug, while Socket.IO uses the office `_id`. This keeps links readable and realtime identity stable.

## HTTP contract

All office endpoints require `Authorization: Bearer <token>`.

### Create an office

`POST /api/offices`

```json
{
  "name": "Computer Science Lab"
}
```

Creates the office and creator membership and returns `201`.

```json
{
  "office": {
    "id": "<office ObjectId>",
    "name": "Computer Science Lab",
    "slug": "computer-science-lab",
    "role": "admin",
    "createdAt": "<ISO timestamp>"
  }
}
```

### List joined offices

`GET /api/offices`

Returns offices where the signed-in user has a membership, with the role derived from `Office.adminId`.

### Read an office

`GET /api/offices/:officeSlug`

Returns the office and the caller's role. A non-member receives `404` so a private office's details are not exposed.

### Create an invitation

`POST /api/offices/:officeSlug/invitations`

Creates a single-use invitation for the `member` role. Only the office admin can call it.

The response contains the raw token once. The client constructs the copyable link from the current browser origin; MongoDB stores only the token hash.

### Accept an invitation

`POST /api/invitations/:token/accept`

Validates the signed-in user and invitation, creates the membership, and returns the office slug for redirection.

## Client routes

- `/dashboard` shows created and joined offices.
- `/offices/:officeSlug` loads an authorized office and renders the existing spatial world.
- `/invitations/:token` lets a signed-in user accept an invitation.
- Temporary `/room/:roomId` routes are retired. Every realtime room is a persistent office.

## Socket.IO access

The client sends its existing JWT in the Socket.IO handshake. The server verifies it and stores the user ID on the socket.

When the client opens an office:

1. The client asks to join using the office ID resolved by the authorized HTTP request.
2. The server verifies that the office exists.
3. The server verifies that the socket user has a membership.
4. Only then does the server join the socket to the office room and accept movement, conversation, zone, and WebRTC events.

The server uses the approved office ID stored on the socket for later events. A client-provided room ID is not treated as authorization.

## Persistence boundary

Stored in MongoDB:

- Offices.
- Office memberships.
- Invitations.

Kept in server memory:

- Connected players and current positions.
- Movement updates.
- Conversation groups.
- Private-zone locks.
- Microphone, camera, screen-sharing, and WebRTC state.

Restarting the server preserves offices and memberships but resets live presence. Returning users start at the existing default spawn point.

## Failure states

- Invalid office name: return `400`.
- Missing or expired JWT: return `401`.
- Non-member office access: return `404`.
- Member attempting an admin action: return `403`.
- Expired or accepted invitation: show a clear invalid-invitation message.
- Slug collision: generate another slug on the server.
- Database unavailable: show an actionable dashboard error; do not create a temporary fallback room.
- Partial office creation or invitation acceptance: roll back the transaction and return an error.
- Socket membership check failure: do not create presence state; emit `room-access-denied` and return the user to the dashboard.

## Manual acceptance test

1. Sign in with the first account.
2. Create an office named `Computer Science Lab`.
3. Confirm it appears on the dashboard and opens at `/offices/computer-science-lab`.
4. Restart the server and confirm the office still appears and opens.
5. Create an invitation and copy its link.
6. Open the link while signed in with a second account and accept it.
7. Confirm the second account becomes a member and sees the office on its dashboard.
8. Open the office in both accounts and confirm movement and spatial conversation still work.
9. Confirm the member cannot create invitations.
10. Confirm a third signed-in account without membership cannot read the office or join its Socket.IO room.
11. Confirm a signed-out user cannot create, list, enter, or subscribe to offices.

## Implementation slices

### Slice 1: Persistent office foundation

- Add `Office` and `Membership` models.
- Create, list, and read offices through authenticated HTTP endpoints.
- Generate stable slugs.
- Update the dashboard and add the office route.
- Load the existing world using the office ID as its realtime room key.
- Verify persistence across a server restart.

Status: implemented.

### Slice 2: Member invitations

- Add the `Invitation` model and invitation routes.
- Add invitation creation and acceptance UI.

Status: implemented.

### Slice 3: Office authorization

- Enforce office membership for socket joins and subsequent realtime events.
- Bind the authorized office ID to the socket and reject mismatched event room IDs.
- Verify admin/member permissions with two signed-in accounts.

Status: implemented.

## Completion criteria

Phase 2 is complete when:

- A signed-in user can create an office and becomes its admin.
- The office survives server restarts and keeps the same slug.
- The admin can invite another signed-in user through a copyable link.
- Accepting the invitation creates the invited user's membership.
- Both users see the office on their dashboards and can enter it.
- Members cannot perform admin-only invitation actions.
- Non-members cannot read the office or subscribe to its Socket.IO state.
- Existing movement and spatial conversation behavior still works inside the office.

## Verification completed

- Client and server strict type checks pass.
- Client and server production builds pass.
- Authentication tests pass: 5 tests.
- Existing Socket.IO and spatial-conversation tests pass: 10 tests.
- Phase 2 model, slug, invitation, and socket-authorization tests pass: 7 tests.
- Client lint reports no errors; four existing warnings remain outside this phase.
- A controlled server stop/start check confirmed an authorized office retained the same database ID and slug.
- Browser verification covered desktop and mobile dashboard layouts, office creation, stable slug navigation, admin invitation creation, signed-out return to the invitation, member acceptance, single-use rejection, joined-office listing, non-member rejection, and the retired room-route 404.

## Known limitations and deferred production work

- Office names cannot be changed yet, although the slug is already modeled as immutable for a future rename flow.
- Slug generation handles existing collisions, but production hardening should retry the insert when two offices with the same name are created concurrently.
- Invitations cannot be listed, revoked, resent, or delivered by email.
- There is no member removal, ownership transfer, role promotion, or additional admin support.
- Membership is checked when a socket joins. Phase 2 has no membership-removal flow, so active sockets are not rechecked on every realtime event.
- Live positions, conversation groups, zone locks, and media state reset when the server restarts.
- MongoDB transactions require a deployment that supports transactions, matching the existing authentication write flow.
- Automated tests use focused model and authorization units; the multi-account flow is currently browser-verified rather than a committed end-to-end test suite.

Future phases can add office renaming, invitation management, member administration, saved positions, multiple spaces, and durable presence without changing the stable office ID used by realtime rooms.
