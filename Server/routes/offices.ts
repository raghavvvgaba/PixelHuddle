import express, { type NextFunction, type Request, type Response } from "express";
import mongoose from "mongoose";
import authenticateToken from "../middleware/auth";
import Invitation from "../models/Invitation";
import Membership from "../models/Membership";
import Office from "../models/Office";
import {
  createInvitationToken,
  createUniqueOfficeSlug,
  getInvitationExpiry,
  hashInvitationToken,
  isOfficeAdmin,
  normalizeOfficeName,
  toOfficeResponse,
} from "../utils/offices";

interface CreateOfficeBody {
  name?: string;
}

const router = express.Router();
const getRouteParam = (value: string | string[]) =>
  (Array.isArray(value) ? value[0] : value) || "";

router.use(authenticateToken);

router.post(
  "/",
  async (req: Request<unknown, unknown, CreateOfficeBody>, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const name = normalizeOfficeName(req.body.name);

    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (name.length < 3 || name.length > 80) {
      return res.status(400).json({ error: "Office name must be between 3 and 80 characters" });
    }

    const session = await mongoose.startSession();

    try {
      const slug = await createUniqueOfficeSlug(name);
      let officeResponse = null;

      await session.withTransaction(async () => {
        const [office] = await Office.create([{ name, slug, adminId: userId }], { session });
        if (!office) throw new Error("Office was not created");

        await Membership.create([{ officeId: office._id, userId }], { session });
        officeResponse = toOfficeResponse(office, userId);
      });

      if (!officeResponse) throw new Error("Office transaction did not complete");
      return res.status(201).json({ office: officeResponse });
    } catch (error) {
      next(error);
    } finally {
      await session.endSession();
    }
  },
);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const memberships = await Membership.find({ userId }).sort({ createdAt: -1 }).lean();
    const officeIds = memberships.map((membership) => membership.officeId);
    const offices = await Office.find({ _id: { $in: officeIds } }).lean();
    const officeById = new Map(offices.map((office) => [office._id.toString(), office]));

    return res.status(200).json({
      offices: memberships
        .map((membership) => officeById.get(membership.officeId.toString()))
        .filter((office): office is NonNullable<typeof office> => Boolean(office))
        .map((office) => toOfficeResponse(office, userId)),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:officeSlug", async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const officeSlug = getRouteParam(req.params.officeSlug).toLowerCase();
    const office = await Office.findOne({ slug: officeSlug }).lean();
    if (!office) return res.status(404).json({ error: "Office not found" });

    const membership = await Membership.exists({ officeId: office._id, userId });
    if (!membership) return res.status(404).json({ error: "Office not found" });

    return res.status(200).json({ office: toOfficeResponse(office, userId) });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:officeSlug/invitations",
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    try {
      const officeSlug = getRouteParam(req.params.officeSlug).toLowerCase();
      const office = await Office.findOne({ slug: officeSlug });
      if (!office) return res.status(404).json({ error: "Office not found" });
      if (!isOfficeAdmin(office, userId)) {
        return res.status(403).json({ error: "Only the office admin can invite members" });
      }

      const token = createInvitationToken();
      const expiresAt = getInvitationExpiry();

      await Invitation.create({
        officeId: office._id,
        createdBy: userId,
        tokenHash: hashInvitationToken(token),
        expiresAt,
      });

      return res.status(201).json({ invitation: { token, expiresAt } });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
