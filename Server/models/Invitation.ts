import mongoose, { type HydratedDocument, type Types } from "mongoose";

export interface InvitationDocument {
  officeId: Types.ObjectId;
  createdBy: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  acceptedBy?: Types.ObjectId;
  acceptedAt?: Date;
  createdAt: Date;
}

const invitationSchema = new mongoose.Schema<InvitationDocument>(
  {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      immutable: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      select: false,
    },
    expiresAt: { type: Date, required: true, immutable: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const Invitation = mongoose.model<InvitationDocument>("Invitation", invitationSchema);

export type InvitationHydratedDocument = HydratedDocument<InvitationDocument>;
export default Invitation;
