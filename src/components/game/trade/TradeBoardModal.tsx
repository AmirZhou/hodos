"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  X, ShoppingBag, Package, Crown, Shirt, Hand, Footprints,
  Shield, CircleDot, Gem, Sword, BookOpen, Scroll, Lock,
} from "lucide-react";
import {
  getRarityColor, RARITY_BORDER_COLORS, RARITY_BG_COLORS,
  getSlotLabel, formatStatValue,
} from "@/lib/equipment";
import type { EquipmentSlot } from "../../../../convex/data/equipmentItems";

const SLOT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  head: Crown, chest: Shirt, hands: Hand, boots: Footprints,
  cloak: Shield, ring: CircleDot, necklace: Gem,
  mainHand: Sword, offHand: Shield, book: BookOpen,
};

type Tab = "browse" | "my-listings" | "list-item";

interface TradeBoardModalProps {
  campaignId: Id<"campaigns">;
  characterId: Id<"characters">;
  onClose: () => void;
}

export function TradeBoardModal({ campaignId, characterId, onClose }: TradeBoardModalProps) {
  const [tab, setTab] = useState<Tab>("browse");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[var(--background-secondary)] border border-[var(--border)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[var(--accent-gold)]" />
            <h2 className="text-lg font-bold">Trade Board</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-4 pb-2">
          {([
            { id: "browse" as Tab, label: "Browse" },
            { id: "my-listings" as Tab, label: "My Listings" },
            { id: "list-item" as Tab, label: "List Item" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-[var(--accent-gold)] text-black"
                  : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 pt-2">
          {tab === "browse" && (
            <BrowseTab campaignId={campaignId} characterId={characterId} />
          )}
          {tab === "my-listings" && (
            <MyListingsTab characterId={characterId} />
          )}
          {tab === "list-item" && (
            <ListItemTab characterId={characterId} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Browse Tab ============

function BrowseTab({ campaignId, characterId }: { campaignId: Id<"campaigns">; characterId: Id<"characters"> }) {
  const listings = useQuery(api.game.trade.getActiveListings, { campaignId });
  const acceptListing = useMutation(api.game.trade.acceptListing);
  const [accepting, setAccepting] = useState<string | null>(null);

  if (!listings) {
    return <div className="text-center py-12 text-[var(--foreground-muted)]">Loading...</div>;
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--foreground-muted)]">
        <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No items listed for trade</p>
      </div>
    );
  }

  const handleAccept = async (listingId: Id<"tradeListings">) => {
    setAccepting(listingId);
    try {
      await acceptListing({ listingId, buyerId: characterId });
    } catch (e: unknown) {
      console.error("Accept failed:", e);
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="space-y-2">
      {listings.map((listing) => {
        const { item } = listing;
        const Icon = SLOT_ICONS[item.type] || Scroll;
        const rarityColor = getRarityColor(item.rarity as never);
        const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];
        const bgColor = RARITY_BG_COLORS[item.rarity as keyof typeof RARITY_BG_COLORS];
        const isOwnListing = listing.sellerId === characterId;
        const keyStat = getKeyStat(item);

        return (
          <div
            key={listing._id}
            className="rounded-xl p-3 border flex items-center gap-3"
            style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }}
            >
              <div style={{ color: rarityColor }}><Icon className="h-5 w-5" /></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate" style={{ color: rarityColor }}>
                  {item.name}
                </span>
                <span className="text-[10px] text-[var(--foreground-muted)]">
                  {getSlotLabel(item.type as EquipmentSlot)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {keyStat && (
                  <span className="text-[10px] text-[var(--foreground-muted)]">{keyStat}</span>
                )}
                <span className="text-[10px] text-[var(--foreground-secondary)]">
                  by {listing.sellerName}
                </span>
              </div>
              {listing.askingPrice && (
                <div className="text-[11px] text-[var(--accent-gold)] mt-0.5">
                  Asking: {listing.askingPrice}
                </div>
              )}
            </div>
            <button
              onClick={() => handleAccept(listing._id)}
              disabled={isOwnListing || accepting === listing._id}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--accent-gold)] text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {accepting === listing._id ? "..." : isOwnListing ? "Yours" : "Accept"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============ My Listings Tab ============

function MyListingsTab({ characterId }: { characterId: Id<"characters"> }) {
  const listings = useQuery(api.game.trade.getMyListings, { characterId });
  const delistItem = useMutation(api.game.trade.delistItem);
  const [cancelling, setCancelling] = useState<string | null>(null);

  if (!listings) {
    return <div className="text-center py-12 text-[var(--foreground-muted)]">Loading...</div>;
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--foreground-muted)]">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>You have no active listings</p>
      </div>
    );
  }

  const handleCancel = async (listingId: Id<"tradeListings">) => {
    setCancelling(listingId);
    try {
      await delistItem({ listingId, characterId });
    } catch (e: unknown) {
      console.error("Delist failed:", e);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-2">
      {listings.map((listing) => {
        const { item } = listing;
        const rarityColor = getRarityColor(item.rarity as never);
        const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];

        return (
          <div
            key={listing._id}
            className="rounded-xl p-3 border flex items-center gap-3"
            style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium" style={{ color: rarityColor }}>
                {item.name}
              </span>
              {listing.askingPrice && (
                <div className="text-[11px] text-[var(--accent-gold)] mt-0.5">
                  Asking: {listing.askingPrice}
                </div>
              )}
            </div>
            <button
              onClick={() => handleCancel(listing._id)}
              disabled={cancelling === listing._id}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[var(--accent-red)] text-white hover:brightness-110 disabled:opacity-40 shrink-0"
            >
              {cancelling === listing._id ? "..." : "Cancel"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============ List Item Tab ============

function ListItemTab({ characterId }: { characterId: Id<"characters"> }) {
  const inventory = useQuery(api.equipment.getInventory, { characterId });
  const listItemMut = useMutation(api.game.trade.listItem);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState("");
  const [listing, setListing] = useState(false);

  if (!inventory) {
    return <div className="text-center py-12 text-[var(--foreground-muted)]">Loading...</div>;
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--foreground-muted)]">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No items in your inventory</p>
      </div>
    );
  }

  const handleList = async () => {
    if (!selectedItemId) return;
    setListing(true);
    try {
      await listItemMut({
        characterId,
        itemId: selectedItemId as Id<"items">,
        askingPrice: askingPrice || undefined,
      });
      setSelectedItemId(null);
      setAskingPrice("");
    } catch (e: unknown) {
      console.error("List failed:", e);
    } finally {
      setListing(false);
    }
  };

  return (
    <div>
      {/* Listing form (shown when item selected) */}
      {selectedItemId && (
        <div className="mb-4 p-3 rounded-xl bg-[var(--background-tertiary)] border border-[var(--border)]">
          <div className="text-sm font-medium mb-2">
            Listing: {inventory.find((i: any) => i._id === selectedItemId)?.name}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              placeholder="Asking price (optional, e.g. 'any rare helmet')"
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
            />
            <button
              onClick={handleList}
              disabled={listing}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--accent-gold)] text-black hover:brightness-110 disabled:opacity-40 shrink-0"
            >
              {listing ? "..." : "List for Trade"}
            </button>
            <button
              onClick={() => { setSelectedItemId(null); setAskingPrice(""); }}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inventory grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {inventory.map((item: any, i: number) => {
          const Icon = SLOT_ICONS[item.type] || Scroll;
          const rarityColor = getRarityColor(item.rarity as never);
          const borderColor = RARITY_BORDER_COLORS[item.rarity as keyof typeof RARITY_BORDER_COLORS];
          const bgColor = RARITY_BG_COLORS[item.rarity as keyof typeof RARITY_BG_COLORS];
          const isBound = item.boundTo !== undefined;
          const keyStat = getKeyStat(item);

          return (
            <button
              key={`${item._id}-${i}`}
              onClick={() => !isBound && setSelectedItemId(item._id)}
              disabled={isBound}
              className={`relative rounded-xl p-3 flex flex-col items-center gap-2 transition-all text-left border ${
                isBound
                  ? "opacity-50 cursor-not-allowed"
                  : selectedItemId === item._id
                    ? "ring-2 ring-[var(--accent-gold)] brightness-125 cursor-pointer"
                    : "hover:brightness-125 cursor-pointer"
              }`}
              style={{ borderColor, backgroundColor: "rgba(0,0,0,0.3)" }}
            >
              {isBound && (
                <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded bg-purple-600 text-white font-bold flex items-center gap-0.5">
                  <Lock className="h-2 w-2" /> Soulbound
                </span>
              )}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }}
              >
                <div style={{ color: rarityColor }}><Icon className="h-5 w-5" /></div>
              </div>
              <span className="text-xs text-center truncate w-full font-medium" style={{ color: rarityColor }}>
                {item.name}
              </span>
              {keyStat && (
                <span className="text-[10px] text-[var(--foreground-muted)]">{keyStat}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============ Shared helpers ============

function getKeyStat(item: { type: string; stats: Record<string, number | string | undefined> }) {
  if (item.type === "mainHand" || item.type === "offHand") {
    if (item.stats.damage) return `${item.stats.damage} dmg`;
  }
  if (item.stats.ac) return `+${item.stats.ac} AC`;
  const first = Object.entries(item.stats).find(([, v]) => v !== undefined);
  if (first) return formatStatValue(first[0], first[1] as number);
  return null;
}
