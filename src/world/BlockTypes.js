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
  [BLOCK_TYPES.GRASS]:              new THREE.Color(0x88dd88).lerp(new THREE.Color(0xff69b4), 0.3),
  [BLOCK_TYPES.COTTON_CANDY_WOOD]:  new THREE.Color(0xffb6d5),
  [BLOCK_TYPES.PINK_BRICK]:         new THREE.Color(0xff8fbc),
  [BLOCK_TYPES.CRYSTAL_SUGAR]:      new THREE.Color(0xe0f0ff),
  [BLOCK_TYPES.FROSTING_PLASTER]:   new THREE.Color(0xfff5ee),
  [BLOCK_TYPES.GUMMY_BLOCK]:        new THREE.Color(0xff6b9d),
  [BLOCK_TYPES.CANDY_CANE_BEAM]:    new THREE.Color(0xff4444),
  [BLOCK_TYPES.JELLYBEAN_BRICK]:    new THREE.Color(0xff9933),
  [BLOCK_TYPES.GRAHAM_CRACKER]:     new THREE.Color(0xd2a679),
  [BLOCK_TYPES.CHOCOLATE_SLAB]:     new THREE.Color(0x8b4513),
  [BLOCK_TYPES.BUBBLEGUM_RUBBER]:   new THREE.Color(0xff66cc),
  [BLOCK_TYPES.GLASS_CANDY]:        new THREE.Color(0xcceeFF),
  [BLOCK_TYPES.PEPPERMINT_CRYSTAL]: new THREE.Color(0xaaffee),
  [BLOCK_TYPES.CARAMEL_BLOCK]:      new THREE.Color(0xcc8833),
  [BLOCK_TYPES.MARSHMALLOW_PAD]:    new THREE.Color(0xfff8f0),
  [BLOCK_TYPES.RAINBOW_BLOCK]:      new THREE.Color(0xff69b4), // will cycle in-game
};

export function getBlockColor(type) {
  return BLOCK_COLORS[type] || new THREE.Color(0xff69b4);
}

// Display names for inventory
export const BLOCK_NAMES = {
  [BLOCK_TYPES.GRASS]:              'Candy Grass',
  [BLOCK_TYPES.COTTON_CANDY_WOOD]:  'Cotton Candy Wood',
  [BLOCK_TYPES.PINK_BRICK]:         'Pink Brick',
  [BLOCK_TYPES.CRYSTAL_SUGAR]:      'Crystal Sugar',
  [BLOCK_TYPES.FROSTING_PLASTER]:   'Frosting',
  [BLOCK_TYPES.GUMMY_BLOCK]:        'Gummy Block',
  [BLOCK_TYPES.CANDY_CANE_BEAM]:    'Candy Cane',
  [BLOCK_TYPES.JELLYBEAN_BRICK]:    'Jellybean',
  [BLOCK_TYPES.GRAHAM_CRACKER]:     'Graham Cracker',
  [BLOCK_TYPES.CHOCOLATE_SLAB]:     'Chocolate',
  [BLOCK_TYPES.BUBBLEGUM_RUBBER]:   'Bubblegum',
  [BLOCK_TYPES.GLASS_CANDY]:        'Glass Candy',
  [BLOCK_TYPES.PEPPERMINT_CRYSTAL]: 'Peppermint',
  [BLOCK_TYPES.CARAMEL_BLOCK]:      'Caramel',
  [BLOCK_TYPES.MARSHMALLOW_PAD]:    'Marshmallow',
  [BLOCK_TYPES.RAINBOW_BLOCK]:      'Rainbow',
};
