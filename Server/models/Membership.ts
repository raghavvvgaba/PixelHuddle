import mongoose, { type HydratedDocument, type Types } from "mongoose";

export interface MembershipDocument {
  officeId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new mongoose.Schema<MembershipDocument>(
  {
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      immutable: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ officeId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, createdAt: -1 });

const Membership = mongoose.model<MembershipDocument>("Membership", membershipSchema);

export type MembershipHydratedDocument = HydratedDocument<MembershipDocument>;
export default Membership;
