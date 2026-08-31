import express, { type NextFunction, type Request, type Response } from "express";
import mongoose from "mongoose";
import authenticateToken from "../middleware/auth";
import Invitation from "../models/Invitation";
import Membership from "../models/Membership";
import Office from "../models/Office";
import { hashInvitationToken, toOfficeResponse, type OfficeResponse } from "../utils/offices";

class InvalidInvitationError extends Error {}

const router = express.Router();

router.post(
  "/:token/accept",
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
    if (!token) return res.status(400).json({ error: "This invitation is invalid or no longer available" });

    const session = await mongoose.startSession();

    try {
      let officeResponse: OfficeResponse | null = null;

      await session.withTransaction(async () => {
        const invitation = await Invitation.findOne({
          tokenHash: hashInvitationToken(token),
          acceptedAt: { $exists: false },
          expiresAt: { $gt: new Date() },
        })
          .select("+tokenHash")
          .session(session);

        if (!invitation) throw new InvalidInvitationError();

        const office = await Office.findById(invitation.officeId).session(session);
        if (!office) throw new InvalidInvitationError();

        await Membership.updateOne(
          { officeId: office._id, userId },
          { $setOnInsert: { officeId: office._id, userId } },
          { upsert: true, session },
        );

        invitation.acceptedBy = new mongoose.Types.ObjectId(userId);
        invitation.acceptedAt = new Date();
        await invitation.save({ session });

        officeResponse = toOfficeResponse(office, userId);
      });

      if (!officeResponse) throw new Error("Invitation transaction did not complete");
      return res.status(200).json({ office: officeResponse });
    } catch (error) {
      if (error instanceof InvalidInvitationError) {
        return res.status(400).json({ error: "This invitation is invalid or no longer available" });
      }

      next(error);
    } finally {
      await session.endSession();
    }
  },
);

export default router;
