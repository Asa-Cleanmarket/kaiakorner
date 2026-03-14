import { BLOCK_TYPES, ITEM_TYPES } from '../world/BlockTypes.js';

export const RECIPES = [
  {
    name: 'Pink Brick',
    result: BLOCK_TYPES.PINK_BRICK,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.COTTON_CANDY_WOOD, count: 2 },
    ],
  },
  {
    name: 'Candy Cane Beam',
    result: BLOCK_TYPES.CANDY_CANE_BEAM,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.PINK_BRICK, count: 2 },
      { type: BLOCK_TYPES.CRYSTAL_SUGAR, count: 1 },
    ],
  },
  {
    name: 'Glass Candy',
    result: BLOCK_TYPES.GLASS_CANDY,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.CRYSTAL_SUGAR, count: 3 },
    ],
  },
  {
    name: 'Gummy Block',
    result: BLOCK_TYPES.GUMMY_BLOCK,
    resultCount: 2,
    ingredients: [
      { type: BLOCK_TYPES.BUBBLEGUM_RUBBER, count: 2 },
      { type: BLOCK_TYPES.COTTON_CANDY_WOOD, count: 1 },
    ],
  },
  {
    name: 'Rainbow Block',
    result: BLOCK_TYPES.RAINBOW_BLOCK,
    resultCount: 1,
    ingredients: [
      { type: BLOCK_TYPES.CRYSTAL_SUGAR, count: 2 },
      { type: BLOCK_TYPES.GUMMY_BLOCK, count: 1 },
      { type: BLOCK_TYPES.COTTON_CANDY_WOOD, count: 1 },
    ],
  },
  {
    name: 'Marshmallow Pad',
    result: BLOCK_TYPES.MARSHMALLOW_PAD,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.COTTON_CANDY_WOOD, count: 3 },
    ],
  },
  {
    name: 'Chocolate Slab',
    result: BLOCK_TYPES.CHOCOLATE_SLAB,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.GRAHAM_CRACKER, count: 2 },
      { type: BLOCK_TYPES.CARAMEL_BLOCK, count: 1 },
    ],
  },
  {
    name: 'Frosting Plaster',
    result: BLOCK_TYPES.FROSTING_PLASTER,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.CRYSTAL_SUGAR, count: 2 },
      { type: BLOCK_TYPES.MARSHMALLOW_PAD, count: 1 },
    ],
  },
  {
    name: 'Peppermint Crystal',
    result: BLOCK_TYPES.PEPPERMINT_CRYSTAL,
    resultCount: 2,
    ingredients: [
      { type: BLOCK_TYPES.CRYSTAL_SUGAR, count: 3 },
      { type: BLOCK_TYPES.GLASS_CANDY, count: 1 },
    ],
  },
  {
    name: 'Jellybean Brick',
    result: BLOCK_TYPES.JELLYBEAN_BRICK,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.GUMMY_BLOCK, count: 2 },
      { type: BLOCK_TYPES.PINK_BRICK, count: 1 },
    ],
  },
  {
    name: 'Caramel Block',
    result: BLOCK_TYPES.CARAMEL_BLOCK,
    resultCount: 4,
    ingredients: [
      { type: BLOCK_TYPES.GRAHAM_CRACKER, count: 3 },
    ],
  },
  {
    name: 'Candy Cane Sword',
    result: ITEM_TYPES.CANDY_CANE_SWORD,
    resultCount: 1,
    ingredients: [
      { type: BLOCK_TYPES.CANDY_CANE_BEAM, count: 4 },
      { type: BLOCK_TYPES.CRYSTAL_SUGAR, count: 5 },
      { type: BLOCK_TYPES.RAINBOW_BLOCK, count: 2 },
    ],
  },
];

export class CraftingSystem {
  constructor(inventory) {
    this.inventory = inventory;
    this.isOpen = false;
    this.selectedRecipe = 0;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  canCraft(recipe) {
    for (const ing of recipe.ingredients) {
      if (this.inventory.getCount(ing.type) < ing.count) return false;
    }
    return true;
  }

  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    for (const ing of recipe.ingredients) {
      this.inventory.remove(ing.type, ing.count);
    }
    this.inventory.add(recipe.result, recipe.resultCount);
    if (this.progression) this.progression.onItemCrafted();
    if (this.sound) this.sound.playCraft();
    return true;
  }

  getAvailableRecipes() {
    return RECIPES.map((r, i) => ({
      ...r,
      index: i,
      canCraft: this.canCraft(r),
    }));
  }
}
