import mongoose from "mongoose";
import Invitation from "../models/Invitation";
import Membership from "../models/Membership";
import Office from "../models/Office";
import { __testing, type AppSocket } from "../socket/socketHandler";
import {
  createInvitationToken,
  createUniqueOfficeSlug,
  getInvitationExpiry,
  hashInvitationToken,
  isOfficeAdmin,
  normalizeOfficeName,
  slugifyOfficeName,
  toOfficeResponse,
} from "../utils/offices";

describe("persistent office model", () => {
  test("normalizes office names and creates readable slugs", () => {
    expect(normalizeOfficeName("  Computer   Science Lab  ")).toBe("Computer Science Lab");
    expect(slugifyOfficeName("Computer Science Lab")).toBe("computer-science-lab");
    expect(slugifyOfficeName("✨✨")).toBe("office");
  });

  test("keeps an available slug stable and suffixes a collision", async () => {
    await expect(createUniqueOfficeSlug("Computer Science Lab", async () => false))
      .resolves.toBe("computer-science-lab");

    const checkedSlugs: string[] = [];
    const slug = await createUniqueOfficeSlug("Computer Science Lab", async (candidate) => {
      checkedSlugs.push(candidate);
      return candidate === "computer-science-lab";
    });

    expect(slug).toMatch(/^computer-science-lab-[a-f0-9]{4}$/);
    expect(checkedSlugs[0]).toBe("computer-science-lab");
  });

  test("derives the role from the office admin instead of membership state", () => {
    const adminId = new mongoose.Types.ObjectId();
    const office = {
      _id: new mongoose.Types.ObjectId(),
      name: "Studio",
      slug: "studio",
      adminId,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    expect(isOfficeAdmin(office, adminId.toString())).toBe(true);
    expect(toOfficeResponse(office, adminId.toString()).role).toBe("admin");
    expect(toOfficeResponse(office, new mongoose.Types.ObjectId().toString()).role).toBe("member");
  });

  test("defines the membership uniqueness and dashboard query indexes", () => {
    const indexes = Membership.schema.indexes();

    expect(indexes).toContainEqual([
      { officeId: 1, userId: 1 },
      expect.objectContaining({ unique: true }),
    ]);
    expect(indexes).toContainEqual([{ userId: 1, createdAt: -1 }, expect.any(Object)]);
    expect(Office.schema.path("slug").options).toMatchObject({ unique: true, immutable: true });
    expect(Invitation.schema.path("tokenHash").options).toMatchObject({ unique: true, select: false });
  });
});

describe("office invitations", () => {
  test("generates a raw token, stores a deterministic hash, and expires in seven days", () => {
    const token = createInvitationToken();
    const now = new Date("2026-07-22T00:00:00.000Z");

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken(token)).toHaveLength(64);
    expect(hashInvitationToken(token)).toBe(hashInvitationToken(token));
    expect(hashInvitationToken(token)).not.toBe(token);
    expect(getInvitationExpiry(now).toISOString()).toBe("2026-07-29T00:00:00.000Z");
  });
});

describe("office socket authorization", () => {
  const { canJoinOffice, getAuthorizedRoomId } = __testing;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("only accepts events for the office bound to the socket", () => {
    const officeId = new mongoose.Types.ObjectId().toString();
    const socket = { data: { roomId: officeId } } as AppSocket;

    expect(getAuthorizedRoomId(socket, officeId.toUpperCase())).toBe(officeId);
    expect(getAuthorizedRoomId(socket, new mongoose.Types.ObjectId().toString())).toBe("");
    expect(getAuthorizedRoomId({ data: { roomId: null } } as AppSocket, officeId)).toBe("");
  });

  test("requires both an existing office and membership before joining", async () => {
    const officeId = new mongoose.Types.ObjectId().toString();
    const officeExists = jest.spyOn(Office, "exists").mockResolvedValue({ _id: officeId } as never);
    const membershipExists = jest.spyOn(Membership, "exists").mockResolvedValue({ _id: "membership" } as never);

    await expect(canJoinOffice(officeId, "user-1")).resolves.toBe(true);

    membershipExists.mockResolvedValueOnce(null);
    await expect(canJoinOffice(officeId, "user-2")).resolves.toBe(false);

    await expect(canJoinOffice("temporary-room", "user-1")).resolves.toBe(false);
    expect(officeExists).toHaveBeenCalledTimes(2);
  });
});
