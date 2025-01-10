/**
 * @file src/api/index.ts
 * @description Type-safe API routes for the Farbarter marketplace using Ponder
 */

import { Context, ponder } from "ponder:registry";
import {
  listing as ListingTable,
  escrow as EscrowTable,
  userProfile as UserProfileTable,
} from "ponder:schema";
import { eq, desc, and, gt, lt, sql } from "ponder";

// Constants from smart contract
const REPUTATION_THRESHOLD = 100;
const DISPUTE_TIMELOCK = 7 * 24 * 60 * 60; // 7 days in seconds
const MAX_BLOCK_PURCHASES = 5;
const MAX_PRICE = BigInt("100000000000000000"); // 0.1 ETH
const MIN_PRICE = BigInt("100000000000000"); // 0.0001 ETH
const PROTOCOL_FEE_BPS = 250; // 2.5%
const SLASH_THRESHOLD = 3;

// API Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Utility function to serialize BigInt values
const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  return obj;
};

// Utility function to parse pagination params
const getPaginationParams = (c: any) => {
  const cursor = c.req.query("cursor") || null;
  const limit = Math.min(
    parseInt(c.req.query("limit") || DEFAULT_PAGE_SIZE.toString()),
    MAX_PAGE_SIZE
  );
  const direction = c.req.query("direction") === "prev" ? "prev" : "next";
  return { cursor, limit, direction };
};

// Listings endpoints
ponder.get("/listings", async (c) => {
  const { cursor, limit, direction } = getPaginationParams(c);

  const listings = await c.db.query.listing.findMany({
    limit: limit + 1,
    orderBy: (fields) => [desc(fields.createdAt)],
    where: cursor
      ? (fields) =>
          direction === "next"
            ? lt(fields.createdAt, BigInt(cursor))
            : gt(fields.createdAt, BigInt(cursor))
      : undefined,
  });

  const hasMore = listings.length > limit;
  const items = listings.slice(0, limit);

  return c.json(
    serializeBigInt({
      items,
      nextCursor: hasMore
        ? items[items.length - 1]?.createdAt?.toString()
        : null,
      prevCursor: cursor ? listings[0]?.createdAt?.toString() : null,
    })
  );
});

ponder.get("/listings/fid/:fid", async (c) => {
  const fid = parseInt(c.req.param("fid") || "0");
  const { cursor, limit, direction } = getPaginationParams(c);

  const listings = await c.db.query.listing.findMany({
    limit: limit + 1,
    orderBy: (fields) => [desc(fields.createdAt)],
    where: (fields) =>
      cursor
        ? and(
            eq(fields.fid, fid),
            direction === "next"
              ? lt(fields.createdAt, BigInt(cursor))
              : gt(fields.createdAt, BigInt(cursor))
          )
        : eq(fields.fid, fid),
  });

  const hasMore = listings.length > limit;
  const items = listings.slice(0, limit);

  return c.json(
    serializeBigInt({
      items,
      nextCursor: hasMore
        ? items[items.length - 1]?.createdAt?.toString()
        : null,
      prevCursor: cursor ? listings[0]?.createdAt?.toString() : null,
    })
  );
});

// Escrow endpoints
ponder.get("/escrows", async (c) => {
  const { cursor, limit, direction } = getPaginationParams(c);

  const escrows = await c.db.query.escrow.findMany({
    limit: limit + 1,
    orderBy: (fields) => [desc(fields.createdAt)],
    where: cursor
      ? (fields) =>
          direction === "next"
            ? lt(fields.createdAt, BigInt(cursor))
            : gt(fields.createdAt, BigInt(cursor))
      : undefined,
  });

  const hasMore = escrows.length > limit;
  const items = escrows.slice(0, limit);

  return c.json(
    serializeBigInt({
      items,
      nextCursor: hasMore
        ? items[items.length - 1]?.createdAt?.toString()
        : null,
      prevCursor: cursor ? escrows[0]?.createdAt?.toString() : null,
    })
  );
});

// User profile endpoints
ponder.get("/user/:address", async (c) => {
  const address = c.req.param("address");
  if (!address) return c.json({ error: "Address required" }, 400);

  const profile = await c.db.query.userProfile.findFirst({
    where: (fields) =>
      eq(fields.id, `0x${address.toLowerCase().replace("0x", "")}`),
  });

  if (!profile) return c.json({ error: "Profile not found" }, 404);
  return c.json(serializeBigInt(profile));
});

// Stats endpoint
ponder.get("/stats", async (c) => {
  const [listingCount, escrowCount, userCount, activeListings] =
    await Promise.all([
      c.db.select({ count: sql`count(*)` }).from(ListingTable),
      c.db.select({ count: sql`count(*)` }).from(EscrowTable),
      c.db.select({ count: sql`count(*)` }).from(UserProfileTable),
      c.db
        .select({ count: sql`count(*)` })
        .from(ListingTable)
        .where(eq(ListingTable.isActive, true)),
    ]);

  return c.json(
    serializeBigInt({
      totalListings: Number(listingCount[0]?.count),
      totalEscrows: Number(escrowCount[0]?.count),
      totalUsers: Number(userCount[0]?.count),
      activeListings: Number(activeListings[0]?.count),
      constants: {
        reputationThreshold: REPUTATION_THRESHOLD,
        disputeTimelock: DISPUTE_TIMELOCK,
        maxBlockPurchases: MAX_BLOCK_PURCHASES,
        maxPrice: MAX_PRICE.toString(),
        minPrice: MIN_PRICE.toString(),
        protocolFeeBps: PROTOCOL_FEE_BPS,
        slashThreshold: SLASH_THRESHOLD,
      },
    })
  );
});

export default ponder;
