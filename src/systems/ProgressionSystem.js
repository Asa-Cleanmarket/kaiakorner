const LEVEL_TITLES = [
  'Sugar Newbie',      // 1
  'Candy Collector',   // 2
  'Sweet Seeker',      // 3
  'Sugar Scout',       // 4
  'Cove Explorer',     // 5
  'Candy Crafter',     // 6
  'Sugar Builder',     // 7
  'Gummy Guardian',    // 8
  'Sweet Warrior',     // 9
  'Cove Defender',     // 10
  'Crystal Hunter',    // 11
  'Peppermint Pro',    // 12
  'Frosting Fighter',  // 13
  'Caramel Captain',   // 14
  'Jellybean Hero',    // 15
  'Marshmallow Master',// 16
  'Rainbow Ranger',    // 17
  'Cotton Candy King',  // 18
  'Sugar Champion',     // 19
  'Candy Overlord',     // 20
];

const BADGES = {
  first_block: { name: 'First Block', desc: 'Place your first block', icon: '🧱' },
  tree_chopper: { name: 'Lumberjack', desc: 'Chop 10 trees', icon: '🪓' },
  monster_slayer: { name: 'Monster Slayer', desc: 'Defeat 20 monsters', icon: '⚔️' },
  boss_defeater: { name: 'Boss Crusher', desc: 'Defeat Taffy the Terrible', icon: '👑' },
  explorer: { name: 'Explorer', desc: 'Visit all 5 biomes', icon: '🗺️' },
  builder: { name: 'Master Builder', desc: 'Place 100 blocks', icon: '🏗️' },
  crafter: { name: 'Master Crafter', desc: 'Craft 20 items', icon: '⚒️' },
  survivor: { name: 'Night Survivor', desc: 'Survive 5 nights', icon: '🌙' },
  sugar_rush: { name: 'Sugar Rush', desc: 'Eat 20 cotton candy', icon: '🍬' },
  dog_lover: { name: 'Best Friend', desc: 'Play with your dog for 10 min', icon: '🐕' },
};

function xpForLevel(level) {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export class ProgressionSystem {
  constructor() {
    this.xp = 0;
    this.level = 1;
    this.totalXp = 0;
    this.badges = new Set();

    // Tracking stats
    this.stats = {
      blocksPlaced: 0,
      blocksBreoken: 0,
      treesChopped: 0,
      monstersKilled: 0,
      bossesDefeated: 0,
      nightsSurvived: 0,
      candyEaten: 0,
      itemsCrafted: 0,
      biomesVisited: new Set(),
      dogTime: 0,
    };

    this.xpGainQueue = []; // For showing +XP popups
    this.levelUpMessage = '';
    this.levelUpTimer = 0;
    this.badgeMessage = '';
    this.badgeTimer = 0;
  }

  addXp(amount, reason) {
    this.xp += amount;
    this.totalXp += amount;
    this.xpGainQueue.push({ amount, reason });

    // Level up check
    while (this.xp >= xpForLevel(this.level) && this.level < 20) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.levelUpMessage = `LEVEL UP! ${this.level} — ${this.getTitle()}`;
      this.levelUpTimer = 4;
    }
  }

  getTitle() {
    return LEVEL_TITLES[Math.min(this.level - 1, LEVEL_TITLES.length - 1)];
  }

  getXpToNext() {
    return xpForLevel(this.level);
  }

  getXpProgress() {
    return this.xp / xpForLevel(this.level);
  }

  // Award events
  onBlockPlaced() {
    this.stats.blocksPlaced++;
    this.addXp(2, 'block');
    this.checkBadge('first_block', this.stats.blocksPlaced >= 1);
    this.checkBadge('builder', this.stats.blocksPlaced >= 100);
  }

  onTreeChopped() {
    this.stats.treesChopped++;
    this.addXp(10, 'chop');
    this.checkBadge('tree_chopper', this.stats.treesChopped >= 10);
  }

  onMonsterKilled() {
    this.stats.monstersKilled++;
    this.addXp(25, 'kill');
    this.checkBadge('monster_slayer', this.stats.monstersKilled >= 20);
  }

  onBossDefeated() {
    this.stats.bossesDefeated++;
    this.addXp(500, 'boss');
    this.checkBadge('boss_defeater', true);
  }

  onNightSurvived() {
    this.stats.nightsSurvived++;
    this.addXp(50, 'survive');
    this.checkBadge('survivor', this.stats.nightsSurvived >= 5);
  }

  onCandyEaten() {
    this.stats.candyEaten++;
    this.addXp(5, 'eat');
    this.checkBadge('sugar_rush', this.stats.candyEaten >= 20);
  }

  onItemCrafted() {
    this.stats.itemsCrafted++;
    this.addXp(15, 'craft');
    this.checkBadge('crafter', this.stats.itemsCrafted >= 20);
  }

  onBiomeVisited(biome) {
    this.stats.biomesVisited.add(biome);
    this.checkBadge('explorer', this.stats.biomesVisited.size >= 5);
  }

  checkBadge(id, condition) {
    if (!condition || this.badges.has(id)) return;
    this.badges.add(id);
    const badge = BADGES[id];
    this.badgeMessage = `${badge.icon} BADGE: ${badge.name} — ${badge.desc}`;
    this.badgeTimer = 4;
    this.addXp(100, 'badge');
  }

  update(delta) {
    if (this.levelUpTimer > 0) this.levelUpTimer -= delta;
    if (this.badgeTimer > 0) this.badgeTimer -= delta;
    // Drain xp gain queue
    if (this.xpGainQueue.length > 5) this.xpGainQueue = this.xpGainQueue.slice(-5);
  }
}
