import { BLOCK_TYPES, BLOCK_NAMES, ITEM_TYPES, ITEM_NAMES, WEAPON_STATS } from '../world/BlockTypes.js';

const HOTBAR_SIZE = 9;

export class Inventory {
  constructor() {
    // Items: Map of itemType -> count
    this.items = new Map();
    this.selectedSlot = 0;

    // Hotbar: array of item types (or null)
    this.hotbar = new Array(HOTBAR_SIZE).fill(null);

    // Start with weapons and basic resources
    this.add(ITEM_TYPES.LOLLIPOP_AXE, 1);
    this.add(ITEM_TYPES.GUMBALL_LAUNCHER, 1);
    this.add(BLOCK_TYPES.COTTON_CANDY_WOOD, 20);
    this.add(BLOCK_TYPES.PINK_BRICK, 10);
  }

  add(type, count) {
    const current = this.items.get(type) || 0;
    this.items.set(type, current + count);

    // Auto-assign to hotbar if there's an empty slot
    if (!this.hotbar.includes(type)) {
      const emptySlot = this.hotbar.indexOf(null);
      if (emptySlot !== -1) {
        this.hotbar[emptySlot] = type;
      }
    }
  }

  remove(type, count) {
    // Weapons can't be consumed
    if (WEAPON_STATS[type]) return;
    const current = this.items.get(type) || 0;
    const newCount = Math.max(0, current - count);
    if (newCount === 0) {
      this.items.delete(type);
      // Remove from hotbar
      const slot = this.hotbar.indexOf(type);
      if (slot !== -1) this.hotbar[slot] = null;
    } else {
      this.items.set(type, newCount);
    }
  }

  getCount(type) {
    return this.items.get(type) || 0;
  }

  getSelectedItem() {
    return this.hotbar[this.selectedSlot] || null;
  }

  getSelectedWeaponStats() {
    const item = this.getSelectedItem();
    return item ? (WEAPON_STATS[item] || null) : null;
  }

  isWeapon(type) {
    return !!WEAPON_STATS[type];
  }

  getSelectedBlockType() {
    const item = this.hotbar[this.selectedSlot];
    // Weapons can't be placed as blocks
    if (item && WEAPON_STATS[item]) return null;
    return item || null;
  }

  changeSlot(direction) {
    this.selectedSlot = ((this.selectedSlot + direction) % HOTBAR_SIZE + HOTBAR_SIZE) % HOTBAR_SIZE;
  }

  setSlot(index) {
    if (index >= 0 && index < HOTBAR_SIZE) {
      this.selectedSlot = index;
    }
  }

  getHotbarItems() {
    return this.hotbar.map((type, i) => ({
      type,
      count: type ? this.getCount(type) : 0,
      name: type ? (BLOCK_NAMES[type] || ITEM_NAMES[type] || type) : null,
      selected: i === this.selectedSlot,
    }));
  }
}
