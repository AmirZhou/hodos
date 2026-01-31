"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { EquipmentSlotComponent } from "./EquipmentSlot";
import { InventoryGrid } from "./InventoryGrid";
import { useState } from "react";
import { Package, Shield } from "lucide-react";
import type { EquipedSlot } from "../../../../convex/data/equipmentItems";

interface EquipmentPanelProps {
  characterId: Id<"characters">;
}

export function EquipmentPanel({ characterId }: EquipmentPanelProps) {
  const equipment = useQuery(api.equipment.getEquipment, { characterId });
  const inventory = useQuery(api.equipment.getInventory, { characterId });
  const equipItem = useMutation(api.equipment.equipItem);
  const unequipItem = useMutation(api.equipment.unequipItem);

  const [tab, setTab] = useState<"equipment" | "inventory">("equipment");

  if (!equipment) return null;

  const handleUnequip = (slot: EquipedSlot) => {
    if (equipment[slot]) {
      unequipItem({ characterId, slot });
    }
  };

  const handleEquip = (itemId: string, targetSlot?: string) => {
    equipItem({ characterId, itemId: itemId as any, targetSlot });
  };

  const eq = equipment as Record<string, unknown>;

  return (
    <div>
      {/* Tab Toggle */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setTab("equipment")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${
            tab === "equipment"
              ? "bg-[var(--accent-purple)] text-white"
              : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
          }`}
        >
          <Shield className="h-3 w-3" />
          Equipment
        </button>
        <button
          onClick={() => setTab("inventory")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${
            tab === "inventory"
              ? "bg-[var(--accent-purple)] text-white"
              : "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
          }`}
        >
          <Package className="h-3 w-3" />
          Inventory ({inventory?.length ?? 0})
        </button>
      </div>

      {tab === "equipment" ? (
        <div className="flex flex-col items-center gap-2">
          {/* Row 1: Head */}
          <div className="flex justify-center">
            <EquipmentSlotComponent
              slot="head"
              item={eq.head as never}
              onClick={() => handleUnequip("head")}
            />
          </div>

          {/* Row 2: Main Hand, Chest, Off Hand */}
          <div className="flex items-center gap-2">
            <EquipmentSlotComponent
              slot="mainHand"
              item={eq.mainHand as never}
              onClick={() => handleUnequip("mainHand")}
            />
            <EquipmentSlotComponent
              slot="chest"
              item={eq.chest as never}
              onClick={() => handleUnequip("chest")}
            />
            <EquipmentSlotComponent
              slot="offHand"
              item={eq.offHand as never}
              onClick={() => handleUnequip("offHand")}
            />
          </div>

          {/* Row 3: Hands */}
          <div className="flex justify-center">
            <EquipmentSlotComponent
              slot="hands"
              item={eq.hands as never}
              onClick={() => handleUnequip("hands")}
            />
          </div>

          {/* Row 4: Ring 1, Boots, Ring 2 */}
          <div className="flex items-center gap-2">
            <EquipmentSlotComponent
              slot="ring1"
              item={eq.ring1 as never}
              onClick={() => handleUnequip("ring1")}
            />
            <EquipmentSlotComponent
              slot="boots"
              item={eq.boots as never}
              onClick={() => handleUnequip("boots")}
            />
            <EquipmentSlotComponent
              slot="ring2"
              item={eq.ring2 as never}
              onClick={() => handleUnequip("ring2")}
            />
          </div>

          {/* Row 5: Necklace, Cloak, Book */}
          <div className="flex items-center gap-2">
            <EquipmentSlotComponent
              slot="necklace"
              item={eq.necklace as never}
              onClick={() => handleUnequip("necklace")}
            />
            <EquipmentSlotComponent
              slot="cloak"
              item={eq.cloak as never}
              onClick={() => handleUnequip("cloak")}
            />
            <EquipmentSlotComponent
              slot="book"
              item={eq.book as never}
              onClick={() => handleUnequip("book")}
            />
          </div>
        </div>
      ) : (
        <InventoryGrid
          items={inventory ?? []}
          onEquip={handleEquip}
        />
      )}
    </div>
  );
}
