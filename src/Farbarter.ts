import { ponder } from "ponder:registry";
import { listing, escrow, userProfile } from "ponder:schema";
import { getContract } from "viem";
import { FarbarterAbi } from "../abis/FarbarterAbi";
import { eq, sql } from "ponder";

ponder.on("Farbarter:ListingCreated", async ({ event, context }) => {
  const { db } = context;
  const {
    listingId,
    seller,
    fid,
    price,
    supply,
    metadata,
    preferredToken,
    preferredChain,
  } = event.args;

  await db.insert(listing).values({
    id: listingId,
    seller,
    fid: Number(fid),
    price,
    supply,
    remainingSupply: supply,
    metadata,
    isActive: true,
    totalSales: 0n,
    createdAt: BigInt(event.block.timestamp),
    lastUpdatedAt: BigInt(event.block.timestamp),
    preferredToken,
    preferredChain,
  });
});

ponder.on("Farbarter:ListingPurchased", async ({ event, context }) => {
  const { db } = context;
  const { listingId, buyer, quantity, escrowId } = event.args;

  // Update listing
  const listingData = await db.find(listing, { id: listingId });

  if (!listingData) {
    throw new Error(`Listing ${listingId} not found`);
  }

  await db.update(listing, { id: listingId }).set({
    remainingSupply: listingData.remainingSupply - quantity,
    totalSales: listingData.totalSales + quantity,
    lastUpdatedAt: BigInt(event.block.timestamp),
  });

  // Create escrow record
  await db.insert(escrow).values({
    id: escrowId,
    buyer,
    seller:
      event.transaction.to ?? "0x0000000000000000000000000000000000000000",
    amount: event.transaction.value,
    buyerConfirmed: false,
    sellerConfirmed: false,
    isDisputed: false,
    createdAt: BigInt(event.block.timestamp),
    completedAt: null,
    listingId,
    buyerFid: 0n, // Default to 0 since we can't get this from event
  });
});

ponder.on("Farbarter:EscrowConfirmed", async ({ event, context }) => {
  const { db } = context;
  const { escrowId, confirmedBy, isBuyer } = event.args;

  await db
    .update(escrow, { id: escrowId })
    .set(isBuyer ? { buyerConfirmed: true } : { sellerConfirmed: true });
});

ponder.on("Farbarter:EscrowCompleted", async ({ event, context }) => {
  const { db } = context;
  const { escrowId, amount } = event.args;

  await db.update(escrow, { id: escrowId }).set({
    completedAt: BigInt(event.block.timestamp),
  });
});

ponder.on("Farbarter:DisputeRaised", async ({ event, context }) => {
  const { db } = context;
  const { escrowId, raisedBy } = event.args;

  await db.update(escrow, { id: escrowId }).set({
    isDisputed: true,
  });
});

ponder.on("Farbarter:DisputeResolved", async ({ event, context }) => {
  const { db } = context;
  const { escrowId, winner, resolution } = event.args;

  await db.update(escrow, { id: escrowId }).set({
    completedAt: BigInt(event.block.timestamp),
  });
});

ponder.on("Farbarter:ReputationUpdated", async ({ event, context }) => {
  const { db } = context;
  const { user, newReputation, reason } = event.args;

  await db
    .insert(userProfile)
    .values({
      id: user,
      reputation: newReputation,
      totalSales: 0n,
      totalPurchases: 0n,
      lastActivityAt: BigInt(event.block.timestamp),
      isTrusted: newReputation >= 100n,
      slashCount: 0n,
    })
    .onConflictDoUpdate(() => ({
      reputation: newReputation,
      lastActivityAt: BigInt(event.block.timestamp),
      isTrusted: newReputation >= 100n,
    }));
});
