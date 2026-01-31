# Item Instance System Design

## Problem

Items are currently embedded as objects inside `character.inventory[]`, `character.equipped.{slot}`, and `lootContainers.items[]`. Every item copy uses the same template ID (e.g. `"main_legendary_01"`) with no unique identity. This makes it impossible to:

- Distinguish between two copies of the same item
- Track item ownership history
- Implement trading between players
- Implement WoW-style binding (BOE/BOP/soulbound)
- Build a GM admin panel to inspect the item economy

## Solution

Normalize items into their own `items` table. Each item copy is a first-class document with a unique instance ID, ownership via query (not embedded arrays), and binding state.

---

## Schema

### `items` table

```typescript
items: defineTable({
  // Identity
  templateId: v.string(),           // "main_legendary_01" — links to item catalog
  instanceId: v.string(),           // crypto.randomUUID() — globally unique per copy

  // Where is this item right now?
  status: v.union(
    v.literal("inventory"),         // in a character's bag
    v.literal("equipped"),          // worn by a character
    v.literal("container"),         // inside a loot container
    v.literal("ground"),            // loose on the ground at a location
    v.literal("listed"),            // on trade board (future)
    v.literal("destroyed"),         // soft-delete
  ),

  // Ownership / location (set based on status)
  ownerId: v.optional(v.id("characters")),         // set when inventory or equipped
  equippedSlot: v.optional(v.string()),             // "head", "mainHand", etc. (only when equipped)
  containerId: v.optional(v.id("lootContainers")), // set when in container
  locationId: v.optional(v.id("locations")),        // set when on ground
  campaignId: v.id("campaigns"),

  // Binding
  bindingRule: v.union(v.literal("boe"), v.literal("bop"), v.literal("none")),
  boundTo: v.optional(v.id("characters")),          // null = not yet bound

  // Item data (denormalized from template at creation time)
  name: v.string(),
  description: v.string(),
  type: v.string(),                 // "head", "chest", "mainHand", etc.
  rarity: v.string(),               // "mundane", "common", ... "legendary"
  stats: v.object({
    ac: v.optional(v.number()),
    hp: v.optional(v.number()),
    speed: v.optional(v.number()),
    damage: v.optional(v.string()),
    strength: v.optional(v.number()),
    dexterity: v.optional(v.number()),
    constitution: v.optional(v.number()),
    intelligence: v.optional(v.number()),
    wisdom: v.optional(v.number()),
    charisma: v.optional(v.number()),
  }),
  specialAttributes: v.optional(v.record(v.string(), v.number())),
  passive: v.optional(v.string()),

  createdAt: v.number(),
})
  .index("by_owner", ["ownerId"])
  .index("by_container", ["containerId"])
  .index("by_campaign_and_location", ["campaignId", "locationId"])
  .index("by_campaign", ["campaignId"])
  .index("by_instance", ["instanceId"])
```

### `itemHistory` table

```typescript
itemHistory: defineTable({
  itemId: v.id("items"),
  campaignId: v.id("campaigns"),
  event: v.union(
    v.literal("created"),           // item enters the world
    v.literal("looted"),            // picked up from container/ground
    v.literal("equipped"),          // worn by character
    v.literal("unequipped"),        // removed from slot
    v.literal("traded"),            // changed hands between players
    v.literal("bound"),             // became soulbound
    v.literal("destroyed"),         // removed from game
    v.literal("listed"),            // put on trade board
    v.literal("delisted"),          // removed from trade board
  ),
  actorId: v.optional(v.id("characters")),    // who did this
  targetId: v.optional(v.id("characters")),   // recipient (for trades)
  metadata: v.optional(v.string()),           // "looted from Merchant's Cart"
  createdAt: v.number(),
})
  .index("by_item", ["itemId"])
  .index("by_campaign", ["campaignId", "createdAt"])
```

### `lootContainers` table (updated)

Remove the `items` array. Container contents are queried from the `items` table by `containerId`.

```typescript
lootContainers: defineTable({
  campaignId: v.id("campaigns"),
  locationId: v.id("locations"),
  containerType: v.union(
    v.literal("ground"),
    v.literal("chest"),
    v.literal("corpse"),
    v.literal("container")
  ),
  name: v.string(),
  description: v.optional(v.string()),
  // items array REMOVED
  lock: v.optional(v.object({
    isLocked: v.boolean(),
    dc: v.optional(v.number()),
    keyItemId: v.optional(v.string()),
  })),
  isOpened: v.boolean(),
  isLooted: v.boolean(),
  sourceType: v.optional(v.string()),
  sourceEntityId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_campaign_and_location", ["campaignId", "locationId"]),
```

### `characters` table (updated)

Remove `inventory` and `equipped` fields. Character items are queried from the `items` table by `ownerId`.

---

## Binding Model

### Rules

| bindingRule | Trigger | Result |
|---|---|---|
| `bop` | Character picks up item (loot, DM grant, ground) | `boundTo` set immediately |
| `boe` | Character equips item for the first time | `boundTo` set on equip |
| `none` | Never | `boundTo` stays null forever |

### Enforcement

- `boundTo !== null` → item cannot be traded, listed, or transferred
- `boundTo === null` → item is freely tradeable regardless of bindingRule
- BOE in inventory unequipped → still tradeable
- BOE equipped then unequipped → stays bound, no take-backs

### Default bindingRule by rarity

Added to each item template in `equipmentItems.ts`:

| Rarity | Default bindingRule |
|---|---|
| legendary | `bop` |
| epic | `boe` |
| rare | `none` |
| uncommon | `none` |
| common | `none` |
| mundane | `none` |

DM or seed system can override per-instance at creation time.

---

## Key Operations

### Create item instance

Used by: seedContainer, DM grants, giveStartingGear.

```
1. Look up template by templateId
2. Resolve bindingRule (template default or override)
3. Insert into items table with status, ownerId/containerId, campaignId
4. Insert "created" event into itemHistory
5. If BOP and going directly to a character, also set boundTo and log "bound"
```

### Take item from container

```
1. Read item from items table
2. Patch item: status → "inventory", ownerId → characterId, containerId → undefined
3. If BOP: also set boundTo → characterId, log "bound" to itemHistory
4. Log "looted" to itemHistory with metadata "from {containerName}"
5. Check if container has remaining items; if not, set isLooted = true
```

### Equip item

```
1. Read item from items table (must be status "inventory", ownerId matches)
2. If slot occupied, unequip existing item first (→ status "inventory")
3. Patch item: status → "equipped", equippedSlot → slot
4. If BOE and boundTo is null: set boundTo → characterId, log "bound"
5. Log "equipped" to itemHistory
```

### Unequip item

```
1. Read item from items table (must be status "equipped", ownerId matches)
2. Patch item: status → "inventory", equippedSlot → undefined
3. Log "unequipped" to itemHistory
```

### Get character inventory (query)

```
Query items table: ownerId = characterId, status = "inventory"
```

### Get character equipment (query)

```
Query items table: ownerId = characterId, status = "equipped"
Build slot map: { [equippedSlot]: item }
```

### Get container items (query)

```
Query items table: containerId = containerId
```

---

## Item Catalog Changes

Add `bindingRule` to each item template in `convex/data/equipmentItems.ts`:

```typescript
export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  type: EquipmentSlot;
  rarity: Rarity;
  bindingRule: "boe" | "bop" | "none";  // NEW
  stats: { ... };
  specialAttributes?: { ... };
  passive?: string;
}
```

Default assignment: legendary → bop, epic → boe, everything else → none.

---

## Files Changed

### Phase 1: Foundation (backend)

| File | Change |
|---|---|
| `convex/schema.ts` | Add `items` + `itemHistory` tables. Remove `inventory` + `equipped` from characters. Remove `items` from lootContainers. |
| `convex/data/equipmentItems.ts` | Add `bindingRule` field to EquipmentItem interface and every item in the catalog. |
| `convex/equipment.ts` | Rewrite `equipItem`, `unequipItem`, `addItemToInventory`, `removeItemFromInventory`, `getEquipment`, `getInventory`, `giveStartingGear` to use items table. Remove `itemToDoc()`. |
| `convex/game/loot.ts` | Rewrite `getContainersAtLocation`, `takeItem`, `takeAllItems`, `seedContainer` to use items table. |
| `convex/game/itemGrants.ts` | Update `validateItemGrants` to return bindingRule from template. |
| `convex/game/actions.ts` | Update item grant handling to create item instances. Update container creation to create item instances. |
| `convex/characters.ts` | Remove any references to inventory/equipped arrays in character creation. |

### Phase 2: Frontend

| File | Change |
|---|---|
| `src/components/game/equipment/InventoryModal.tsx` | Consume new query shape (items with _id instead of array index). |
| `src/components/game/equipment/EquipmentPanel.tsx` | Consume new equipped query (slot map from items table). |
| `src/components/game/equipment/InventoryGrid.tsx` | Update ItemData interface to include `_id: Id<"items">`. |
| `src/components/game/equipment/EquipmentSlot.tsx` | Update to use item `_id` for actions. |
| `src/components/game/equipment/ItemTooltip.tsx` | Add binding status display (Soulbound / Bind on Equip badge). |
| `src/components/game/loot/LootPopup.tsx` | Use item `_id` for takeItem instead of array index. |
| `src/components/game/map/LocationView.tsx` | Update ground items and container queries. |
| `src/app/(game)/play/[campaignId]/page.tsx` | Update sidebar equipment grid to new query shape. |

### Phase 3: New features (future)

| Feature | Description |
|---|---|
| GM admin panel | Query items by campaignId. Filter by status, owner, location. Inspect any player's gear. |
| Item history viewer | Query itemHistory by itemId. Show timeline on item tooltip. |
| Binding enforcement | Check boundTo before trade/transfer. Show "Soulbound" badge in UI. |
| Trade system | Set item status to "listed". Trade board queries items with status "listed". |

---

## Migration Notes

- Existing data does not need to be preserved.
- After Phase 1, existing characters will have empty inventories. Use `giveStartingGear` to re-equip.
- After Phase 1, existing loot containers will be empty. Re-seed with `seedContainer`.
- No dual-write needed. Cut over cleanly.
