# Equipment System Design - Hodos RPG

**Date:** 2026-01-27
**Game:** Hodos - Adult D&D RPG
**Version:** 1.0

---

## Overview

This document defines the complete equipment system for Hodos, including 11 equipment slots, 6 rarity tiers, and a comprehensive database of ~170 unique items. The system integrates traditional D&D mechanics with adult-themed content in a natural, immersive way.

---

## Rarity Tiers

| Rarity | Color | Hex | Distribution | Design Philosophy |
|---|---|---|---|---|
| Mundane | Gray | #9d9d9d | 2-3 per slot | Starter gear, no special effects |
| Common | White | #ffffff | 3-4 per slot | Basic functional equipment |
| Uncommon | Green | #1eff00 | 3-4 per slot | Minor magical effects, 1 special attribute |
| Rare | Blue | #0070dd | 2-3 per slot | Moderate magic, 1-2 special attributes |
| Epic | Purple | #a335ee | 2 per slot | Strong magic, 2-3 special attributes |
| Legendary | Orange | #ff8000 | 2 per slot | Unique items with 3-4+ special attributes and unique passives |

---

## Equipment Slots

1. **Head** - Helmets, crowns, circlets, hoods
2. **Chest** - Armor, robes, corsets, tunics
3. **Hands** - Gauntlets, gloves, bracers
4. **Boots** - Footwear of all types
5. **Cloak** - Cloaks, capes, mantles
6. **Ring** (x2) - Magical rings (two slots available)
7. **Necklace** - Amulets, collars, pendants
8. **Main Hand** - Weapons, implements, tools
9. **Off Hand** - Shields, focus items, secondary weapons
10. **Book** - Spellbooks, manuals, grimoires

---

## Attribute System

### Core Stats
- **strength** - Physical power, melee damage
- **dexterity** - Agility, AC, ranged attacks
- **constitution** - Health, endurance
- **intelligence** - Spellcasting, knowledge
- **wisdom** - Perception, insight
- **charisma** - Social influence, presence

### Combat Stats
- **critChance** - Percentage increase to critical hit chance
- **damageBonus** - Flat damage added to attacks
- **spellPower** - Spell damage/DC increase
- **healingPower** - Healing effectiveness bonus

### Utility Stats
- **stealthBonus** - Stealth check modifier
- **perceptionBonus** - Perception check modifier
- **persuasionBonus** - Persuasion check modifier
- **xpBonus** - Percentage bonus to XP gain

### Special Stats (Adult-Themed)
- **seduction** - Seduction/persuasion in intimate contexts
- **intimidation** - Intimidation/domination effectiveness
- **submission** - Submission/pain processing capability
- **bondageArts** - Ropework/restraint skill
- **sensationMastery** - Sensation crafting ability
- **trustBuilding** - NPC trust gain rate
- **aftercarePower** - Aftercare effectiveness
- **painThreshold** - Resistance to pain/damage in scenes
- **allure** - Passive NPC attraction
- **commandPresence** - Domination/scene control bonus

---

## Equipment Database

### 1. HEAD SLOT (15 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| head_gray_01 | Mundane | Worn Leather Cap | Bonnet de Cuir Usé | AC +1 | - | Basic protection |
| head_gray_02 | Mundane | Torn Hood | Capuche Déchirée | AC +1 | - | Threadbare and worn |
| head_white_01 | Common | Traveler's Hat | Chapeau de Voyageur | AC +1, WIS +1 | - | Simple but sturdy |
| head_white_02 | Common | Iron Helm | Heaume de Fer | AC +2 | - | Standard soldier's helm |
| head_white_03 | Common | Apprentice's Cap | Bonnet d'Apprenti | AC +1, INT +1 | - | Scholar's headwear |
| head_green_01 | Uncommon | Hood of Shadows | Capuche des Ombres | AC +2, DEX +1 | stealthBonus: 2 | Blends into darkness |
| head_green_02 | Uncommon | Circlet of Insight | Diadème de Perspicacité | AC +1, WIS +2 | perceptionBonus: 2 | Sharpens the senses |
| head_green_03 | Uncommon | Velvet Mask | Masque de Velours | AC +1, CHA +2 | allure: 1 | Mysterious and alluring |
| head_blue_01 | Rare | Crown of Command | Couronne du Commandement | AC +2, CHA +3 | commandPresence: 3, persuasionBonus: 2 | Natural authority radiates from wearer |
| head_blue_02 | Rare | Helm of the Tactician | Heaume du Tacticien | AC +3, INT +2, WIS +1 | - | +1 to initiative rolls |
| head_epic_01 | Epic | Diadem of Domination | Diadème de Domination | AC +2, CHA +4, WIS +2 | commandPresence: 4, intimidation: 3, seduction: 2 | Enemies feel compelled to obey |
| head_epic_02 | Epic | Mindbreaker's Crown | Couronne du Brise-Esprit | AC +2, INT +4, CHA +2 | spellPower: 15, intimidation: 3, sensationMastery: 2 | Spells penetrate mental defenses easier |
| head_legendary_01 | Legendary | Veil of the Siren Queen | Voile de la Reine Sirène | AC +3, CHA +5, WIS +3 | seduction: 5, allure: 4, persuasionBonus: 4, trustBuilding: 3 | **Passive:** All NPCs within 30ft have disadvantage on WIS saves against charm. Once per rest, automatically succeed on a seduction check. |
| head_legendary_02 | Legendary | Obsidian Crown of the Tyrant | Couronne d'Obsidienne du Tyran | AC +4, STR +3, CHA +5 | commandPresence: 5, intimidation: 5, damageBonus: 10, critChance: 5 | **Passive:** Enemies below 25% HP must make DC 18 WIS save or submit. Allies within 30ft gain +2 to attack rolls. |
| head_gray_03 | Mundane | Tattered Bandana | Bandana Effiloché | AC +1 | - | Better than nothing |

### 2. CHEST SLOT (16 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| chest_gray_01 | Mundane | Ragged Shirt | Chemise en Haillons | AC +1 | - | Barely holds together |
| chest_gray_02 | Mundane | Cracked Leather Vest | Gilet de Cuir Fissuré | AC +2 | - | Seen better days |
| chest_white_01 | Common | Linen Tunic | Tunique de Lin | AC +2, CON +1 | - | Clean and comfortable |
| chest_white_02 | Common | Chainmail Shirt | Chemise de Mailles | AC +4 | - | Standard armor |
| chest_white_03 | Common | Traveler's Coat | Manteau de Voyageur | AC +2, DEX +1 | - | Practical and durable |
| chest_white_04 | Common | Scholar's Robes | Robes d'Érudit | AC +2, INT +1 | - | Academic attire |
| chest_green_01 | Uncommon | Reinforced Breastplate | Cuirasse Renforcée | AC +5, CON +1 | - | Expertly crafted protection |
| chest_green_02 | Uncommon | Silk Corset of Grace | Corset de Soie Gracieux | AC +3, DEX +2, CHA +1 | allure: 2 | Accentuates form beautifully |
| chest_green_03 | Uncommon | Robe of the Evoker | Robe de l'Évocateur | AC +3, INT +2 | spellPower: 5 | Crackles with arcane energy |
| chest_blue_01 | Rare | Plate Armor of the Vanguard | Armure de Plates de l'Avant-Garde | AC +7, STR +2, CON +2 | - | Imposing full plate |
| chest_blue_02 | Rare | Leather of Whispers | Cuir des Murmures | AC +4, DEX +3, CHA +1 | stealthBonus: 3, seduction: 2 | Moves silently, catches eyes |
| chest_blue_03 | Rare | Binding Corset of Control | Corset d'Emprise | AC +3, CHA +3, CON +1 | commandPresence: 3, bondageArts: 2, painThreshold: 2 | Wearer feels centered, controlled |
| chest_epic_01 | Epic | Dragon Scale Mail | Cotte de Mailles d'Écailles de Dragon | AC +8, STR +3, CON +3, CHA +2 | damageBonus: 8, critChance: 3 | Resistance to fire damage |
| chest_epic_02 | Epic | Robes of Forbidden Desire | Robes du Désir Interdit | AC +4, INT +3, CHA +4, WIS +2 | spellPower: 18, seduction: 4, sensationMastery: 3, allure: 3 | Spells that charm or dominate gain +2 DC |
| chest_legendary_01 | Legendary | Armor of the Eternal Champion | Armure du Champion Éternel | AC +10, STR +4, CON +4, DEX +2 | damageBonus: 15, healingPower: 10, critChance: 5 | **Passive:** Heal 5 HP at start of each turn in combat. Immune to exhaustion. All melee damage +20%. |
| chest_legendary_02 | Legendary | Empress's Regalia | Régalia de l'Impératrice | AC +5, CHA +6, INT +3, WIS +3 | seduction: 6, commandPresence: 5, allure: 5, trustBuilding: 4, persuasionBonus: 5 | **Passive:** All social checks have advantage. NPCs start at +1 trust level. Can command any NPC to perform one action per rest (DC 20 WIS save to resist). |

### 3. HANDS SLOT (14 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| hands_gray_01 | Mundane | Rough Gloves | Gants Rugueux | AC +1 | - | Basic hand protection |
| hands_gray_02 | Mundane | Torn Wraps | Bandes Déchirées | AC +0 | - | Barely functional |
| hands_white_01 | Common | Leather Gloves | Gants de Cuir | AC +1, DEX +1 | - | Standard adventurer's gloves |
| hands_white_02 | Common | Iron Gauntlets | Gantelets de Fer | AC +2, STR +1 | - | Heavy metal gauntlets |
| hands_white_03 | Common | Silk Gloves | Gants de Soie | AC +1, CHA +1 | - | Refined and elegant |
| hands_green_01 | Uncommon | Gloves of Dexterity | Gants de Dextérité | AC +1, DEX +2 | - | Fingers move with preternatural speed |
| hands_green_02 | Uncommon | Binding Wraps | Bandes d'Emprise | AC +1, STR +1, DEX +1 | bondageArts: 2 | Expertly wrap and secure |
| hands_green_03 | Uncommon | Gloves of the Pickpocket | Gants du Pickpocket | AC +1, DEX +2 | stealthBonus: 2 | +5 to sleight of hand |
| hands_blue_01 | Rare | Gauntlets of Might | Gantelets de Puissance | AC +2, STR +3 | damageBonus: 5 | Unarmed strikes deal +1d6 damage |
| hands_blue_02 | Rare | Sensate Gloves | Gants Sensitifs | AC +1, DEX +2, WIS +2 | sensationMastery: 3, perceptionBonus: 2 | Feel every texture with clarity |
| hands_epic_01 | Epic | Fists of the Berserker | Poings du Berserker | AC +3, STR +4, CON +2 | damageBonus: 12, critChance: 4 | Unarmed strikes crit on 18-20 |
| hands_epic_02 | Epic | Gloves of Exquisite Touch | Gants du Toucher Exquis | AC +2, DEX +3, CHA +3, WIS +2 | sensationMastery: 5, bondageArts: 3, aftercarePower: 3 | All touch-based checks have advantage |
| hands_legendary_01 | Legendary | The Artisan's Embrace | L'Étreinte de l'Artisan | AC +3, DEX +5, CHA +4, WIS +3 | sensationMastery: 7, bondageArts: 5, aftercarePower: 5, trustBuilding: 4 | **Passive:** Can manipulate rope/restraints with advantage. Binding checks can't fail. Bound targets gain +2 to pleasure/pain threshold. |
| hands_legendary_02 | Legendary | Worldbreaker Gauntlets | Gantelets Brise-Monde | AC +4, STR +6, CON +3 | damageBonus: 20, critChance: 8, intimidation: 4 | **Passive:** All melee attacks deal double damage to objects/structures. On crit, target is stunned until end of next turn. |

### 4. BOOTS SLOT (14 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| boots_gray_01 | Mundane | Worn Sandals | Sandales Usées | AC +0, Speed +0 | - | Better than barefoot |
| boots_gray_02 | Mundane | Tattered Boots | Bottes en Lambeaux | AC +1, Speed +0 | - | Holes in the soles |
| boots_white_01 | Common | Leather Boots | Bottes de Cuir | AC +1, Speed +5 | - | Reliable footwear |
| boots_white_02 | Common | Iron-Shod Boots | Bottes Ferrées | AC +2, STR +1 | - | Heavy but protective |
| boots_white_03 | Common | Soft Shoes | Chaussures Souples | AC +1, DEX +1 | - | Light and quiet |
| boots_green_01 | Uncommon | Boots of Striding | Bottes de Foulée | AC +1, Speed +10, DEX +1 | - | Never tire from walking |
| boots_green_02 | Uncommon | Shadow Steps | Pas d'Ombre | AC +1, Speed +5, DEX +2 | stealthBonus: 3 | Footsteps make no sound |
| boots_green_03 | Uncommon | Heels of Confidence | Talons de Confiance | AC +1, Speed +0, CHA +2 | allure: 2 | Stride with commanding presence |
| boots_blue_01 | Rare | Boots of Speed | Bottes de Vitesse | AC +2, Speed +15, DEX +2 | - | Can Dash as bonus action |
| boots_blue_02 | Rare | Stalker's Treads | Foulées du Traqueur | AC +2, Speed +10, DEX +3 | stealthBonus: 4, perceptionBonus: 2 | Advantage on stealth in natural terrain |
| boots_epic_01 | Epic | Windrunner Boots | Bottes du Coureur de Vent | AC +2, Speed +20, DEX +4, CON +2 | - | Can walk on water for 1 minute/day |
| boots_epic_02 | Epic | Boots of the Midnight Dancer | Bottes de la Danseuse de Minuit | AC +2, Speed +15, DEX +4, CHA +3 | stealthBonus: 5, allure: 3, seduction: 2 | Move through occupied spaces without provoking |
| boots_legendary_01 | Legendary | Seven League Boots | Bottes des Sept Lieues | AC +3, Speed +30, DEX +5, CON +3 | - | **Passive:** Triple movement speed outside combat. Can teleport up to 60ft as bonus action (3/rest). Never fall prone. |
| boots_legendary_02 | Legendary | Dancer's Desire | Désir de la Danseuse | AC +2, Speed +25, DEX +5, CHA +5 | allure: 6, seduction: 5, stealthBonus: 4, sensationMastery: 3 | **Passive:** All movement is fluid and mesmerizing. Enemies must make WIS save (DC 16) or be distracted when you move past. Performance checks automatically succeed. |

### 5. CLOAK SLOT (14 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| cloak_gray_01 | Mundane | Torn Cloak | Cape Déchirée | AC +0 | - | Provides little warmth |
| cloak_gray_02 | Mundane | Wool Blanket | Couverture de Laine | AC +0, CON +1 | - | Wrapped as makeshift cloak |
| cloak_white_01 | Common | Traveler's Cloak | Cape de Voyageur | AC +1, CON +1 | - | Protects from weather |
| cloak_white_02 | Common | Guard's Cape | Cape de Garde | AC +1, CHA +1 | - | Marks authority |
| cloak_white_03 | Common | Hooded Cloak | Cape à Capuche | AC +1, WIS +1 | - | Conceals identity |
| cloak_green_01 | Uncommon | Cloak of Elvenkind | Cape des Elfes | AC +1, DEX +2 | stealthBonus: 3 | Blends into natural surroundings |
| cloak_green_02 | Uncommon | Cape of the Charlatan | Cape du Charlatan | AC +1, CHA +2 | persuasionBonus: 2 | Aids in deception |
| cloak_green_03 | Uncommon | Warm Embrace | Étreinte Chaleureuse | AC +1, CON +2 | aftercarePower: 2 | Provides comfort and warmth |
| cloak_blue_01 | Rare | Cloak of Displacement | Cape de Déplacement | AC +2, DEX +2 | - | Attackers have disadvantage to hit |
| cloak_blue_02 | Rare | Mantle of the Enchanter | Manteau de l'Enchanteur | AC +1, INT +2, CHA +2 | spellPower: 8, persuasionBonus: 3 | Spells appear more impressive |
| cloak_epic_01 | Epic | Shadow Veil | Voile d'Ombre | AC +2, DEX +4, WIS +2 | stealthBonus: 6, perceptionBonus: 3 | Can turn invisible for 1 minute/rest |
| cloak_epic_02 | Epic | Cloak of Many Desires | Cape des Nombreux Désirs | AC +2, CHA +4, WIS +2, INT +2 | allure: 4, seduction: 4, persuasionBonus: 4, trustBuilding: 3 | Appearance shifts to viewer's preferences |
| cloak_legendary_01 | Legendary | Phantom Shroud | Linceul Fantôme | AC +3, DEX +5, INT +3, WIS +3 | stealthBonus: 8, perceptionBonus: 5 | **Passive:** Can become ethereal for up to 10 minutes/day (split as needed). While ethereal, pass through walls and are immune to physical damage. See invisible creatures. |
| cloak_legendary_02 | Legendary | Cloak of the Seducer Supreme | Cape du Séducteur Suprême | AC +2, CHA +6, DEX +3, WIS +3 | seduction: 7, allure: 6, persuasionBonus: 6, trustBuilding: 5, sensationMastery: 4 | **Passive:** All creatures find you irresistibly attractive. Charm spells can't be resisted. Once per rest, make any creature willing for one scene (no save). Social checks can't fail. |

### 6. RING SLOT (18 items - 2 can be equipped)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| ring_gray_01 | Mundane | Tin Ring | Anneau d'Étain | - | - | Worthless trinket |
| ring_gray_02 | Mundane | Copper Band | Anneau de Cuivre | - | - | Tarnishes easily |
| ring_white_01 | Common | Silver Ring | Anneau d'Argent | CHA +1 | - | Simple but elegant |
| ring_white_02 | Common | Iron Band | Anneau de Fer | STR +1 | - | Heavy and solid |
| ring_white_03 | Common | Scholar's Ring | Anneau d'Érudit | INT +1 | - | Bears arcane inscription |
| ring_white_04 | Common | Band of Vitality | Anneau de Vitalité | CON +1, HP +5 | - | Improves endurance |
| ring_green_01 | Uncommon | Ring of Protection | Anneau de Protection | AC +1, CON +1 | - | Deflects minor harm |
| ring_green_02 | Uncommon | Ring of Feather Falling | Anneau de Chute de Plume | DEX +1 | - | Immunity to fall damage |
| ring_green_03 | Uncommon | Ring of Allure | Anneau de Séduction | CHA +2 | allure: 1 | Draws attention naturally |
| ring_blue_01 | Rare | Ring of Power | Anneau de Puissance | STR +3, damageBonus: 5 | - | Amplifies physical might |
| ring_blue_02 | Rare | Ring of Mind Shielding | Anneau de Bouclier Mental | INT +2, WIS +2 | - | Immune to telepathy/mind reading |
| ring_blue_03 | Rare | Ring of Binding | Anneau d'Emprise | DEX +2, CHA +2 | bondageArts: 3, commandPresence: 2 | Restraints you create can't be escaped |
| ring_epic_01 | Epic | Ring of Regeneration | Anneau de Régénération | CON +3, HP +25 | healingPower: 15 | Heal 1d6 HP per turn |
| ring_epic_02 | Epic | Ring of Spell Storing | Anneau de Stockage de Sorts | INT +3, WIS +2 | spellPower: 12 | Store up to 5 spell levels |
| ring_epic_03 | Epic | Ring of the Dominant | Anneau du Dominant | CHA +4, WIS +2 | commandPresence: 4, intimidation: 4, bondageArts: 3 | Domination effects last twice as long |
| ring_legendary_01 | Legendary | Ring of Three Wishes | Anneau des Trois Souhaits | CHA +5, INT +4, WIS +4 | spellPower: 20 | **Passive:** Can cast Wish 3 times total (not per rest). After third use, ring becomes mundane copper band. Each wish can alter reality within reason. |
| ring_legendary_02 | Legendary | Ring of the Archon | Anneau de l'Archonte | All stats +3 | damageBonus: 15, spellPower: 20, healingPower: 20, critChance: 5 | **Passive:** Once per rest, gain advantage on all rolls for 1 minute. Immune to death effects. Can revive with 1 HP once per day. |
| ring_green_04 | Uncommon | Ring of Warmth | Anneau de Chaleur | CON +1 | aftercarePower: 2 | Radiates comforting warmth |

### 7. NECKLACE SLOT (15 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| neck_gray_01 | Mundane | Rope Necklace | Collier de Corde | - | - | Simple hemp cord |
| neck_gray_02 | Mundane | Wooden Pendant | Pendentif en Bois | - | - | Carved with crude symbols |
| neck_white_01 | Common | Silver Chain | Chaîne d'Argent | CHA +1 | - | Polished and clean |
| neck_white_02 | Common | Amulet of Health | Amulette de Santé | CON +1, HP +5 | - | Strengthens constitution |
| neck_white_03 | Common | Leather Collar | Collier de Cuir | CHA +1 | - | Simple but striking |
| neck_white_04 | Common | Holy Symbol | Symbole Sacré | WIS +1 | healingPower: 3 | Divine focus |
| neck_green_01 | Uncommon | Amulet of Proof | Amulette de Protection | AC +1, CON +2 | - | Guards against poison |
| neck_green_02 | Uncommon | Collar of Submission | Collier de Soumission | WIS +2, CHA +1 | submission: 3, trustBuilding: 2 | Wearer feels calm and centered |
| neck_green_03 | Uncommon | Pendant of Insight | Pendentif de Perspicacité | INT +2, WIS +1 | perceptionBonus: 2 | Clarifies thought |
| neck_blue_01 | Rare | Amulet of Natural Armor | Amulette d'Armure Naturelle | AC +2, DEX +2, CON +2 | - | Invisible protective barrier |
| neck_blue_02 | Rare | Collar of Devotion | Collier de Dévotion | CHA +3, WIS +2 | submission: 4, trustBuilding: 3, aftercarePower: 2 | Deepens bonds of trust |
| neck_blue_03 | Rare | Necklace of Fireballs | Collier de Boules de Feu | INT +2 | spellPower: 10 | Contains 7 detachable fireball beads |
| neck_epic_01 | Epic | Amulet of the Planes | Amulette des Plans | INT +3, WIS +3, CHA +2 | spellPower: 15 | Can cast Plane Shift 1/day |
| neck_epic_02 | Epic | Collar of Absolute Control | Collier de Contrôle Absolu | CHA +4, WIS +3, CON +2 | submission: 5, trustBuilding: 4, painThreshold: 4, aftercarePower: 4 | Wearer enters perfect subspace easily |
| neck_legendary_01 | Legendary | The Siren's Call | L'Appel de la Sirène | CHA +6, WIS +4, INT +3 | seduction: 7, allure: 6, persuasionBonus: 6, trustBuilding: 5 | **Passive:** Voice becomes hypnotic. All creatures within 60ft must make DC 18 WIS save or be charmed. Can issue one command per turn to charmed creatures. Charm effects last 24 hours. |
| neck_legendary_02 | Legendary | Amulet of the Eternal Guardian | Amulette du Gardien Éternel | AC +3, All stats +3, HP +50 | healingPower: 25, aftercarePower: 6 | **Passive:** Can't drop below 1 HP (1/day). Automatically stabilize dying allies within 30ft. Grant +5 AC to one ally as bonus action. Immunity to fear and charm. |

### 8. MAIN HAND SLOT (18 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| main_gray_01 | Mundane | Broken Sword | Épée Brisée | Damage: 1d4 | - | Blade is chipped and dull |
| main_gray_02 | Mundane | Wooden Club | Massue en Bois | Damage: 1d4, STR +1 | - | Simple cudgel |
| main_white_01 | Common | Longsword | Épée Longue | Damage: 1d8, STR +1 | - | Standard blade |
| main_white_02 | Common | Quarterstaff | Bâton | Damage: 1d6, WIS +1 | - | Versatile weapon |
| main_white_03 | Common | Riding Crop | Cravache | Damage: 1d4, DEX +1 | intimidation: 1 | Stings sharply |
| main_white_04 | Common | Dagger | Dague | Damage: 1d4, DEX +1 | - | Light and quick |
| main_green_01 | Uncommon | Sword of Sharpness | Épée Aiguisée | Damage: 1d8, STR +2, damageBonus: 3 | - | Cuts through armor easily |
| main_green_02 | Uncommon | Staff of the Adept | Bâton de l'Adepte | Damage: 1d6, INT +2 | spellPower: 8 | Amplifies magic |
| main_green_03 | Uncommon | Flogger of Discipline | Fouet de Discipline | Damage: 1d6, DEX +1, CHA +1 | intimidation: 2, sensationMastery: 2 | Measured strikes land perfectly |
| main_blue_01 | Rare | Flaming Greatsword | Épée à Deux Mains Enflammée | Damage: 2d6 + 1d6 fire, STR +3 | damageBonus: 8 | Blade erupts in flames |
| main_blue_02 | Rare | Staff of Power | Bâton de Puissance | Damage: 1d6, INT +3, WIS +2 | spellPower: 15, critChance: 3 | +2 to spell attack rolls |
| main_blue_03 | Rare | Whip of Dominance | Fouet de Domination | Damage: 1d6, DEX +2, CHA +2 | intimidation: 4, commandPresence: 3, sensationMastery: 3 | Reach: 15ft, targets submit easier |
| main_epic_01 | Epic | Dawnbringer | Porte-Aube | Damage: 1d8 + 2d6 radiant, STR +3, CHA +3 | damageBonus: 15, healingPower: 10 | Sentient sword, sheds sunlight 60ft |
| main_epic_02 | Epic | Archmage's Rod | Bâton de l'Archimage | Damage: 1d8, INT +4, WIS +3 | spellPower: 25, critChance: 5 | Can cast 9th level spells |
| main_epic_03 | Epic | The Punisher | Le Punisseur | Damage: 1d8, DEX +3, CHA +4 | intimidation: 5, sensationMastery: 5, commandPresence: 4, painThreshold: 3 | Strikes land with supernatural precision |
| main_legendary_01 | Legendary | Godslayer Blade | Lame Tue-Dieu | Damage: 2d6 + 3d8 force, STR +5, CON +4 | damageBonus: 30, critChance: 10 | **Passive:** Crits on 15-20. On crit, target makes DC 20 CON save or dies. Against gods/immortals, deals quadruple damage. Can cast Disintegrate at will. |
| main_legendary_02 | Legendary | The Obsidian Kiss | Le Baiser d'Obsidienne | Damage: 1d8 + 2d6 psychic, DEX +4, CHA +6, WIS +3 | sensationMastery: 8, commandPresence: 7, intimidation: 6, seduction: 5, bondageArts: 5 | **Passive:** Attacks deal psychic pleasure/pain. On hit, target makes DC 19 WIS save or is paralyzed with sensation for 1 round. Can switch between pleasure and pain as bonus action. Wielder has perfect control over sensation intensity. |
| main_green_04 | Uncommon | Mace of Smiting | Masse de Châtiment | Damage: 1d6, STR +2 | damageBonus: 4 | +2d8 vs constructs |

### 9. OFF HAND SLOT (16 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| off_gray_01 | Mundane | Wooden Board | Planche de Bois | AC +1 | - | Improvised shield |
| off_gray_02 | Mundane | Torn Buckler | Targe Déchirée | AC +1 | - | Barely functional |
| off_white_01 | Common | Buckler | Targe | AC +1, DEX +1 | - | Small round shield |
| off_white_02 | Common | Steel Shield | Bouclier d'Acier | AC +2 | - | Standard protection |
| off_white_03 | Common | Lantern | Lanterne | - | perceptionBonus: 1 | Illuminates 30ft |
| off_white_04 | Common | Rope Coil | Rouleau de Corde | DEX +1 | bondageArts: 1 | 50ft of quality rope |
| off_green_01 | Uncommon | Shield of Deflection | Bouclier de Déviation | AC +2, DEX +1 | - | Bonus to Dex saves |
| off_green_02 | Uncommon | Focus Orb | Orbe de Focalisation | INT +2 | spellPower: 6 | Spell focus, glows with power |
| off_green_03 | Uncommon | Restraint Kit | Kit de Contrainte | DEX +1, CHA +1 | bondageArts: 3 | Professional quality restraints |
| off_blue_01 | Rare | Shield of Absorption | Bouclier d'Absorption | AC +3, CON +2 | - | Absorbs 10 damage/round |
| off_blue_02 | Rare | Crystal of Amplification | Cristal d'Amplification | INT +3, WIS +2 | spellPower: 12 | Spells cost one less slot level |
| off_blue_03 | Rare | Binding Chains | Chaînes d'Emprise | STR +2, CHA +2 | bondageArts: 4, commandPresence: 3 | Unbreakable restraints |
| off_epic_01 | Epic | Tower Shield +3 | Pavois +3 | AC +4, STR +2, CON +3 | - | Provides half cover |
| off_epic_02 | Epic | Sphere of Annihilation Focus | Sphère de Focalisation d'Annihilation | INT +4, CHA +3 | spellPower: 20, critChance: 4 | Destructive spells deal +50% damage |
| off_legendary_01 | Legendary | Aegis of the Immortal | Égide de l'Immortel | AC +5, All stats +3, HP +40 | healingPower: 20 | **Passive:** When you would take lethal damage, instead drop to 1 HP and gain immunity to damage for 1 round (1/day). Grant +3 AC to all allies within 10ft. Reflect 20% of damage back to attackers. |
| off_legendary_02 | Legendary | The Artisan's Tools | Les Outils de l'Artisan | DEX +5, CHA +5, WIS +4 | bondageArts: 8, sensationMastery: 6, aftercarePower: 6, trustBuilding: 5 | **Passive:** All restraints/bindings you create are works of art. Bound creatures can't escape without permission. Can bind/unbind as bonus action. Bound creatures feel euphoric calm. Grant advantage on all sensation-based checks. |

### 10. BOOK SLOT (16 items)

| ID | Rarity | Name | Name (FR) | Stats | Special Attributes | Passive/Notes |
|---|---|---|---|---|---|---|
| book_gray_01 | Mundane | Torn Spellbook | Grimoire Déchiré | - | - | Missing most pages |
| book_gray_02 | Mundane | Farmer's Almanac | Almanach du Fermier | - | - | Basic farming tips |
| book_white_01 | Common | Apprentice's Primer | Manuel de l'Apprenti | INT +1 | xpBonus: 5 | Learn magic basics |
| book_white_02 | Common | Traveler's Guide | Guide du Voyageur | WIS +1 | perceptionBonus: 1 | Regional information |
| book_white_03 | Common | Book of Techniques | Livre de Techniques | STR +1 | - | Combat fundamentals |
| book_white_04 | Common | Introduction to Intimacy | Introduction à l'Intimité | CHA +1 | seduction: 1 | Basic relationship guide |
| book_green_01 | Uncommon | Spellbook of Evocation | Grimoire d'Évocation | INT +2 | spellPower: 8 | +1 damage per spell level |
| book_green_02 | Uncommon | Manual of War | Manuel de Guerre | STR +1, INT +1 | damageBonus: 5 | Tactical insights |
| book_green_03 | Uncommon | Tome of Sensual Arts | Tome des Arts Sensuels | CHA +2, WIS +1 | sensationMastery: 2, seduction: 2 | Intermediate techniques |
| book_blue_01 | Rare | Libram of High Magic | Libram de Haute Magie | INT +3, WIS +2 | spellPower: 15, xpBonus: 10 | Can prepare +2 spells |
| book_blue_02 | Rare | Tactical Codex | Codex Tactique | INT +3, STR +2 | damageBonus: 8, critChance: 3 | +2 to initiative |
| book_blue_03 | Rare | The Velvet Codex | Le Codex de Velours | CHA +3, WIS +2, INT +1 | seduction: 4, sensationMastery: 3, bondageArts: 2 | Advanced pleasure techniques |
| book_epic_01 | Epic | Arcanum Primordial | Arcanum Primordial | INT +4, WIS +3 | spellPower: 25, xpBonus: 20 | Learn any wizard spell |
| book_epic_02 | Epic | The Black Tome | Le Tome Noir | INT +3, CHA +4, WIS +2 | commandPresence: 5, intimidation: 5, sensationMastery: 4, bondageArts: 4 | Forbidden dark arts |
| book_legendary_01 | Legendary | Book of Infinite Spells | Livre des Sorts Infinis | INT +5, WIS +4, CHA +3 | spellPower: 35, xpBonus: 30 | **Passive:** Know all spells up to 9th level. Can cast any spell without preparing. Spell slots recharge on short rest. +5 to spell attack rolls and save DCs. Can cast two leveled spells per turn. |
| book_legendary_02 | Legendary | The Kama Sutra Immortalis | Le Kama Sutra Immortalis | CHA +6, WIS +5, INT +4, CON +3 | seduction: 8, sensationMastery: 8, bondageArts: 6, aftercarePower: 7, trustBuilding: 6, allure: 6 | **Passive:** Master of all intimate arts. Seduction/persuasion checks automatically succeed. Can bring creatures to ecstasy with a touch. Scenes grant participants temporary HP and advantage for 8 hours. NPCs become devoted after one scene. |

---

## Implementation Notes

### Data Structure

Each item should be stored with the following fields:

```typescript
interface EquipmentItem {
  id: string; // Unique identifier
  name: string; // English name
  nameFr: string; // French name
  type: 'head' | 'chest' | 'hands' | 'boots' | 'cloak' | 'ring' | 'necklace' | 'mainHand' | 'offHand' | 'book';
  rarity: 'mundane' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stats: {
    ac?: number; // Armor class bonus
    hp?: number; // Hit point bonus
    speed?: number; // Movement speed bonus
    damage?: string; // Weapon damage (e.g., "1d8", "2d6+1d6 fire")
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  specialAttributes?: {
    critChance?: number;
    damageBonus?: number;
    spellPower?: number;
    healingPower?: number;
    stealthBonus?: number;
    perceptionBonus?: number;
    persuasionBonus?: number;
    xpBonus?: number;
    seduction?: number;
    intimidation?: number;
    submission?: number;
    bondageArts?: number;
    sensationMastery?: number;
    trustBuilding?: number;
    aftercarePower?: number;
    painThreshold?: number;
    allure?: number;
    commandPresence?: number;
  };
  passive?: string; // Unique passive effect (legendary items)
  description?: string; // Flavor text
}
```

### Rarity Colors (CSS)

```css
.rarity-mundane { color: #9d9d9d; }
.rarity-common { color: #ffffff; }
.rarity-uncommon { color: #1eff00; }
.rarity-rare { color: #0070dd; }
.rarity-epic { color: #a335ee; }
.rarity-legendary { color: #ff8000; }
```

### Balance Considerations

1. **Stat Progression by Rarity:**
   - Mundane: 0-1 stat point, no special attributes
   - Common: 1-2 stat points, no special attributes
   - Uncommon: 2-3 stat points, 1 special attribute (1-3 value)
   - Rare: 3-6 stat points, 1-2 special attributes (2-4 value)
   - Epic: 6-10 stat points, 2-3 special attributes (3-5 value)
   - Legendary: 10-15 stat points, 3-4+ special attributes (4-8 value), unique passive

2. **Two Ring Slots:** Players can equip two rings, allowing for interesting combinations. Consider this when balancing ring effects.

3. **Adult Content Integration:** Adult-themed items should feel natural and integrated, not forced. Mix kinky items with standard fantasy gear. Items like collars, crops, restraints, and corsets should be mechanically viable choices.

4. **Legendary Uniqueness:** Each legendary item should feel truly unique with a powerful passive that changes gameplay. These are meant to be campaign-defining items.

5. **Book Slot Variety:** Books should cover spellbooks, manuals, guides, and grimoires with effects that boost learning, XP, spell power, or grant knowledge.

---

## Future Expansion

### Potential Additions

- **Set Bonuses:** Items that grant additional bonuses when worn together
- **Socket System:** Gems that can be added to items for extra stats
- **Enchanting:** System to upgrade items or add effects
- **Cursed Items:** Powerful items with drawbacks
- **Artifact Weapons:** Weapons that level up with the player
- **Seasonal Items:** Limited-time event equipment

### Item Acquisition Methods

- **Loot Drops:** From enemies and bosses
- **Merchants:** Purchase from shops
- **Crafting:** Create items from materials
- **Quest Rewards:** Complete quests for unique items
- **Random Events:** World events that grant items
- **NPC Gifts:** Build relationships for special items

---

## Conclusion

This equipment system provides a deep, engaging itemization experience for Hodos with 170+ unique items spanning 11 slots and 6 rarity tiers. The integration of adult-themed content is natural and tasteful, with items that feel like genuine D&D equipment while embracing the mature nature of the game.

The legendary items are designed to be memorable, campaign-defining acquisitions that players will be excited to find and use. The progression from mundane gray items to legendary orange gear creates a satisfying sense of character growth and power increase.

All items are designed to support multiple playstyles: combat-focused warriors, spellcasting mages, stealthy rogues, social manipulators, and those who specialize in the intimate arts that make Hodos unique.

---

**End of Document**
