import { createHash, randomBytes } from "crypto";
import type { Types } from "mongoose";
import Office from "../models/Office";

export type OfficeRole = "admin" | "member";

export interface OfficeResponse {
  id: string;
  name: string;
  slug: string;
  role: OfficeRole;
  createdAt: Date;
}

interface OfficeLike {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  adminId: Types.ObjectId;
  createdAt: Date;
}

export const normalizeOfficeName = (name: unknown) =>
  typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";

export const slugifyOfficeName = (name: string) => {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");

  return slug || "office";
};

export const createUniqueOfficeSlug = async (
  name: string,
  isSlugTaken: (slug: string) => Promise<boolean> = async (slug) =>
    Boolean(await Office.exists({ slug })),
) => {
  const baseSlug = slugifyOfficeName(name);
  if (!(await isSlugTaken(baseSlug))) return baseSlug;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").slice(0, 4);
    const candidate = `${baseSlug.slice(0, 59)}-${suffix}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }

  throw new Error("Could not generate a unique office slug");
};

export const toOfficeResponse = (office: OfficeLike, userId: string): OfficeResponse => ({
  id: office._id.toString(),
  name: office.name,
  slug: office.slug,
  role: isOfficeAdmin(office, userId) ? "admin" : "member",
  createdAt: office.createdAt,
});

export const isOfficeAdmin = (office: Pick<OfficeLike, "adminId">, userId: string) =>
  office.adminId.toString() === userId;

export const createInvitationToken = () => randomBytes(32).toString("hex");

export const hashInvitationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const getInvitationExpiry = (now = new Date()) =>
  new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
