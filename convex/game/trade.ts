import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { assertNotBound, logItemEvent } from "../equipment";
import { requireCharacterOwner } from "../lib/auth";

// ============ QUERIES ============

/** All active listings for a campaign, with item data. */
export const getActiveListings = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("tradeListings")
      .withIndex("by_campaign_and_status", (q) =>
        q.eq("campaignId", args.campaignId).eq("status", "active")
      )
      .collect();

    const results = [];
    for (const listing of listings) {
      const item = await ctx.db.get(listing.itemId);
      if (!item) continue;
      results.push({ ...listing, item });
    }
    return results;
  },
});

/** Active listings by a specific seller. */
export const getMyListings = query({
  args: { characterId: v.id("characters") },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("tradeListings")
      .withIndex("by_seller", (q) => q.eq("sellerId", args.characterId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const results = [];
    for (const listing of listings) {
      const item = await ctx.db.get(listing.itemId);
      if (!item) continue;
      results.push({ ...listing, item });
    }
    return results;
  },
});

// ============ MUTATIONS ============

/** List an item for trade on the board. */
export const listItem = mutation({
  args: {
    characterId: v.id("characters"),
    itemId: v.id("items"),
    askingPrice: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.ownerId !== args.characterId || item.status !== "inventory") {
      throw new Error("Item not in your inventory");
    }

    assertNotBound(item);

    // Check no existing active listing for this item
    const existing = await ctx.db
      .query("tradeListings")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (existing) throw new Error("Item is already listed for trade");

    // Set item status to listed
    await ctx.db.patch(args.itemId, { status: "listed" });

    // Insert listing
    await ctx.db.insert("tradeListings", {
      campaignId: item.campaignId,
      itemId: args.itemId,
      sellerId: args.characterId,
      sellerName: character.name,
      askingPrice: args.askingPrice,
      note: args.note,
      status: "active",
      createdAt: Date.now(),
    });

    await logItemEvent(ctx, {
      itemId: args.itemId,
      campaignId: item.campaignId,
      event: "listed",
      actorId: args.characterId,
      metadata: args.askingPrice
        ? `Listed for: ${args.askingPrice}`
        : "Listed for trade",
    });
  },
});

/** Cancel / delist a trade listing. */
export const delistItem = mutation({
  args: {
    listingId: v.id("tradeListings"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");
    if (listing.sellerId !== args.characterId) {
      throw new Error("Not your listing");
    }
    if (listing.status !== "active") {
      throw new Error("Listing is not active");
    }

    // Return item to inventory
    await ctx.db.patch(listing.itemId, { status: "inventory" });

    // Cancel the listing
    await ctx.db.patch(args.listingId, { status: "cancelled" });

    await logItemEvent(ctx, {
      itemId: listing.itemId,
      campaignId: listing.campaignId,
      event: "delisted",
      actorId: args.characterId,
    });
  },
});

/** Accept a trade listing — transfer item to buyer. */
export const acceptListing = mutation({
  args: {
    listingId: v.id("tradeListings"),
    buyerId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");
    if (listing.status !== "active") throw new Error("Listing is no longer active");
    if (listing.sellerId === args.buyerId) {
      throw new Error("Cannot buy your own listing");
    }

    const buyer = await ctx.db.get(args.buyerId);
    if (!buyer) throw new Error("Buyer character not found");

    // Verify buyer is in the same campaign
    if (buyer.campaignId !== listing.campaignId) {
      throw new Error("Buyer is not in the same campaign");
    }

    const item = await ctx.db.get(listing.itemId);
    if (!item) throw new Error("Item no longer exists");

    // Transfer the item
    const patchData: Record<string, unknown> = {
      ownerId: args.buyerId,
      status: "inventory",
    };

    // BOP items bind to buyer on pickup/trade
    if (item.bindingRule === "bop") {
      patchData.boundTo = args.buyerId;
    }

    await ctx.db.patch(listing.itemId, patchData);

    // Complete the listing
    await ctx.db.patch(args.listingId, {
      status: "completed",
      buyerId: args.buyerId,
      buyerName: buyer.name,
      completedAt: Date.now(),
    });

    // Log trade event
    await logItemEvent(ctx, {
      itemId: listing.itemId,
      campaignId: listing.campaignId,
      event: "traded",
      actorId: listing.sellerId,
      targetId: args.buyerId,
      metadata: `Traded to ${buyer.name}`,
    });

    // Log binding if BOP
    if (item.bindingRule === "bop") {
      await logItemEvent(ctx, {
        itemId: listing.itemId,
        campaignId: listing.campaignId,
        event: "bound",
        actorId: args.buyerId,
        metadata: "Bind on Pickup (trade)",
      });
    }
  },
});
