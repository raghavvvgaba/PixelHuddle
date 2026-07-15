export interface Player {
  socketId: string;
  userId: string;
  displayName: string;
  x: number;
  y: number;
  flipX: boolean;
  deafened: boolean;
  lastMoveAt?: number;
}

export interface RoomIdentity {
  userId?: string | null;
  displayName?: string | null;
}

export interface JoinRoomPayload extends RoomIdentity {
  roomId: string;
}

export interface RoomStatePayload {
  roomId: string;
  revision: number;
  players: Player[];
}

export interface PlayerMovePayload {
  roomId: string;
  x: number;
  y: number;
  flipX: boolean;
}

export interface PlayerMovedPayload {
  socketId: string;
  x: number;
  y: number;
  flipX: boolean;
}

export interface ConversationZone {
  id: string;
  name: string;
  isLocked: boolean;
  isLockOwner: boolean;
  hasAccess: boolean;
}

export interface ConversationStatePayload {
  roomId: string;
  peers: Player[];
  zone: ConversationZone | null;
  deafened: boolean;
}

export interface SessionDescriptionPayload {
  type: "answer" | "offer" | "pranswer" | "rollback";
  sdp?: string;
}

export interface IceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface OutgoingWebRtcDescription {
  roomId: string;
  targetSocketId: string;
  description: SessionDescriptionPayload;
}

export interface IncomingWebRtcDescription {
  roomId: string;
  fromSocketId: string;
  description: SessionDescriptionPayload;
}

export interface OutgoingIceCandidate {
  roomId: string;
  targetSocketId: string;
  candidate: IceCandidatePayload;
}

export interface IncomingIceCandidate {
  roomId: string;
  fromSocketId: string;
  candidate: IceCandidatePayload;
}

export type CallReason =
  | "busy"
  | "declined"
  | "disconnect"
  | "hangup"
  | "media-error"
  | "quit-room"
  | "unavailable";

export interface CallRequestPayload {
  roomId: string;
  targetSocketId: string;
}

export interface IncomingCallRequest {
  roomId: string;
  fromSocketId: string;
}

export interface CallResponsePayload {
  roomId: string;
  targetSocketId: string;
  accepted: boolean;
  reason?: CallReason;
}

export interface IncomingCallResponse {
  roomId: string | null;
  fromSocketId: string;
  accepted: boolean;
  reason?: CallReason;
}

export interface CallEndPayload {
  roomId?: string;
  targetSocketId: string;
  reason?: CallReason;
}

export interface IncomingCallEnd {
  roomId: string | null;
  fromSocketId: string;
  reason?: CallReason;
}

export interface ChatMessagePayload {
  roomId: string;
  username: string;
  message: string;
}

export interface IncomingChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

export interface ClientToServerEvents {
  "join-room": (payload: JoinRoomPayload | string) => void;
  "leave-room": (roomId: string) => void;
  "request-room-state": (roomId: string) => void;
  "request-conversation-state": (roomId: string) => void;
  "player-move": (payload: PlayerMovePayload) => void;
  "set-deafened": (payload: { roomId: string; deafened: boolean }) => void;
  "set-zone-lock": (payload: { roomId: string; zoneId: string; locked: boolean }) => void;
  "spatial-webrtc-description": (payload: OutgoingWebRtcDescription) => void;
  "spatial-webrtc-ice-candidate": (payload: OutgoingIceCandidate) => void;
  "call-request": (payload: CallRequestPayload) => void;
  "call-response": (payload: CallResponsePayload) => void;
  "webrtc-description": (payload: OutgoingWebRtcDescription) => void;
  "webrtc-ice-candidate": (payload: OutgoingIceCandidate) => void;
  "call-end": (payload: CallEndPayload) => void;
  "chat-message": (payload: ChatMessagePayload) => void;
}

export interface ServerToClientEvents {
  "room-state": (payload: RoomStatePayload) => void;
  "player-moved": (payload: PlayerMovedPayload) => void;
  "conversation-state": (payload: ConversationStatePayload) => void;
  "spatial-webrtc-description": (payload: IncomingWebRtcDescription) => void;
  "spatial-webrtc-ice-candidate": (payload: IncomingIceCandidate) => void;
  "call-request": (payload: IncomingCallRequest) => void;
  "call-response": (payload: IncomingCallResponse) => void;
  "webrtc-description": (payload: IncomingWebRtcDescription) => void;
  "webrtc-ice-candidate": (payload: IncomingIceCandidate) => void;
  "call-end": (payload: IncomingCallEnd) => void;
  "chat-message": (payload: IncomingChatMessage) => void;
}

export interface SocketData {
  roomId: string | null;
  userId?: string;
  displayName?: string;
  activeCallPeerId: string | null;
  pendingIncomingCallerId: string | null;
  pendingOutgoingTargetId: string | null;
}

export type InterServerEvents = Record<string, never>;
