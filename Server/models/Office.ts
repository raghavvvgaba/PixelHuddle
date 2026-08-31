import mongoose, { type HydratedDocument, type Types } from "mongoose";

export interface OfficeDocument {
  name: string;
  slug: string;
  adminId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const officeSchema = new mongoose.Schema<OfficeDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      immutable: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

const Office = mongoose.model<OfficeDocument>("Office", officeSchema);

export type OfficeHydratedDocument = HydratedDocument<OfficeDocument>;
export default Office;
