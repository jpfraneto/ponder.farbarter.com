import { onchainTable, primaryKey, relations } from "ponder";

export const listing = onchainTable("listing", (t) => ({
  id: t.bigint().primaryKey(),
  seller: t.hex().notNull(),
  fid: t.integer().notNull(),
  price: t.bigint().notNull(),
  supply: t.bigint().notNull(),
  remainingSupply: t.bigint().notNull(),
  metadata: t.text().notNull(),
  isActive: t.boolean().notNull(),
  totalSales: t.bigint().notNull(),
  createdAt: t.bigint().notNull(),
  lastUpdatedAt: t.bigint().notNull(),
  preferredToken: t.hex().notNull(),
  preferredChain: t.bigint().notNull(),
}));

export const listingRelations = relations(listing, ({ one }) => ({
  seller: one(userProfile, {
    fields: [listing.seller],
    references: [userProfile.id],
  }),
}));

export const userProfile = onchainTable("user_profile", (t) => ({
  id: t.hex().primaryKey(), // address
  reputation: t.bigint().notNull(),
  totalSales: t.bigint().notNull(),
  totalPurchases: t.bigint().notNull(),
  isTrusted: t.boolean().notNull(),
  lastActivityAt: t.bigint().notNull(),
  slashCount: t.bigint().notNull(),
}));

export const escrow = onchainTable("escrow", (t) => ({
  id: t.bigint().primaryKey(),
  buyer: t.hex().notNull(),
  seller: t.hex().notNull(),
  amount: t.bigint().notNull(),
  buyerConfirmed: t.boolean().notNull(),
  sellerConfirmed: t.boolean().notNull(),
  isDisputed: t.boolean().notNull(),
  createdAt: t.bigint().notNull(),
  completedAt: t.bigint(),
  listingId: t.bigint().notNull(),
  buyerFid: t.bigint().notNull(),
}));

export const escrowRelations = relations(escrow, ({ one }) => ({
  buyer: one(userProfile, {
    fields: [escrow.buyer],
    references: [userProfile.id],
  }),
  seller: one(userProfile, {
    fields: [escrow.seller],
    references: [userProfile.id],
  }),
  listing: one(listing, {
    fields: [escrow.listingId],
    references: [listing.id],
  }),
}));

export const hasPurchased = onchainTable(
  "has_purchased",
  (t) => ({
    listingId: t.bigint(),
    buyer: t.hex(),
    hasPurchased: t.boolean().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.listingId, table.buyer] }),
  })
);
