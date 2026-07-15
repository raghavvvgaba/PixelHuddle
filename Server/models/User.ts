import mongoose, { type HydratedDocument } from 'mongoose';

export interface UserDocument {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<UserDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model<UserDocument>("User", userSchema);

export type UserHydratedDocument = HydratedDocument<UserDocument>;
export default User;
