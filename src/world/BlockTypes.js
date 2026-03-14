import * as THREE from 'three';

export const BLOCK_TYPES = {
  GRASS: 'grass',
  COTTON_CANDY_WOOD: 'cotton_candy_wood',
  PINK_BRICK: 'pink_brick',
  CRYSTAL_SUGAR: 'crystal_sugar',
  FROSTING_PLASTER: 'frosting_plaster',
  GUMMY_BLOCK: 'gummy_block',
  CANDY_CANE_BEAM: 'candy_cane_beam',
  JELLYBEAN_BRICK: 'jellybean_brick',
  GRAHAM_CRACKER: 'graham_cracker',
  CHOCOLATE_SLAB: 'chocolate_slab',
  BUBBLEGUM_RUBBER: 'bubblegum_rubber',
  GLASS_CANDY: 'glass_candy',
  PEPPERMINT_CRYSTAL: 'peppermint_crystal',
  CARAMEL_BLOCK: 'caramel_block',
  MARSHMALLOW_PAD: 'marshmallow_pad',
  RAINBOW_BLOCK: 'rainbow_block',
};

const BLOCK_COLORS = {
  [BLOCK_TYPES.GRASS]:              new THREE.Color(0x4de680),  // vibrant candy mint green
  [BLOCK_TYPES.COTTON_CANDY_WOOD]:  new THREE.Color(0xff8ec4),  // bright pink
  [BLOCK_TYPES.PINK_BRICK]:         new THREE.Color(0xe87aab),  // medium pink
  [BLOCK_TYPES.CRYSTAL_SUGAR]:      new THREE.Color(0xd4f1ff),
  [BLOCK_TYPES.FROSTING_PLASTER]:   new THREE.Color(0xfff5ee),
  [BLOCK_TYPES.GUMMY_BLOCK]:        new THREE.Color(0xff5c8a),
  [BLOCK_TYPES.CANDY_CANE_BEAM]:    new THREE.Color(0xff4444),
  [BLOCK_TYPES.JELLYBEAN_BRICK]:    new THREE.Color(0xff9933),
  [BLOCK_TYPES.GRAHAM_CRACKER]:     new THREE.Color(0xd2a679),
  [BLOCK_TYPES.CHOCOLATE_SLAB]:     new THREE.Color(0x8b4513),
  [BLOCK_TYPES.BUBBLEGUM_RUBBER]:   new THREE.Color(0xff66cc),
  [BLOCK_TYPES.GLASS_CANDY]:        new THREE.Color(0xcceeFF),
  [BLOCK_TYPES.PEPPERMINT_CRYSTAL]: new THREE.Color(0xaaffee),
  [BLOCK_TYPES.CARAMEL_BLOCK]:      new THREE.Color(0xcc8833),
  [BLOCK_TYPES.MARSHMALLOW_PAD]:    new THREE.Color(0xfff8f0),
  [BLOCK_TYPES.RAINBOW_BLOCK]:      new THREE.Color(0xff69b4),
};

export function getBlockColor(type) {
  return BLOCK_COLORS[type] || new THREE.Color(0xff69b4);
}

// Weapon / tool items (not placeable blocks)
export const ITEM_TYPES = {
  LOLLIPOP_AXE: 'lollipop_axe',
  GUMBALL_LAUNCHER: 'gumball_launcher',
};

export const ITEM_NAMES = {
  [ITEM_TYPES.LOLLIPOP_AXE]: 'Lolli Axe',
  [ITEM_TYPES.GUMBALL_LAUNCHER]: 'Gumball',
};

export const WEAPON_STATS = {
  [ITEM_TYPES.LOLLIPOP_AXE]: {
    treeDamage: 2,
    monsterDamage: 15,
    range: 4,
    cooldown: 0.4,
    type: 'melee',
  },
  [ITEM_TYPES.GUMBALL_LAUNCHER]: {
    treeDamage: 0,
    monsterDamage: 8,
    range: 30,
    cooldown: 0.25,
    type: 'ranged',
    projectileSpeed: 40,
  },
};

export const BLOCK_NAMES = {
  [BLOCK_TYPES.GRASS]:              'Candy Grass',
  [BLOCK_TYPES.COTTON_CANDY_WOOD]:  'CC Wood',
  [BLOCK_TYPES.PINK_BRICK]:         'Pink Brick',
  [BLOCK_TYPES.CRYSTAL_SUGAR]:      'Crystal',
  [BLOCK_TYPES.FROSTING_PLASTER]:   'Frosting',
  [BLOCK_TYPES.GUMMY_BLOCK]:        'Gummy',
  [BLOCK_TYPES.CANDY_CANE_BEAM]:    'Candy Cane',
  [BLOCK_TYPES.JELLYBEAN_BRICK]:    'Jellybean',
  [BLOCK_TYPES.GRAHAM_CRACKER]:     'Graham',
  [BLOCK_TYPES.CHOCOLATE_SLAB]:     'Chocolate',
  [BLOCK_TYPES.BUBBLEGUM_RUBBER]:   'Bubblegum',
  [BLOCK_TYPES.GLASS_CANDY]:        'Glass',
  [BLOCK_TYPES.PEPPERMINT_CRYSTAL]: 'Peppermint',
  [BLOCK_TYPES.CARAMEL_BLOCK]:      'Caramel',
  [BLOCK_TYPES.MARSHMALLOW_PAD]:    'Marshmallow',
  [BLOCK_TYPES.RAINBOW_BLOCK]:      'Rainbow',
};
