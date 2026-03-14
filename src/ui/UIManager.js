import { BLOCK_NAMES, ITEM_NAMES } from '../world/BlockTypes.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.timeIcon = document.getElementById('time-icon');
    this.timeRemaining = document.getElementById('time-remaining');
    this.inventoryBar = document.getElementById('inventory-bar');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.shelterIndicator = document.getElementById('shelter-indicator');
    this.deathScreen = document.getElementById('death-screen');
    this.deathRespawn = document.getElementById('death-respawn');
    this.cheatMessageEl = document.getElementById('cheat-message');
    this.npcIndicator = document.getElementById('npc-indicator');
    this.craftingPanel = document.getElementById('crafting-panel');
    this.craftingRecipes = document.getElementById('crafting-recipes');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    this.minimapTimer = 0;
    this.levelTitle = document.getElementById('level-title');
    this.xpBar = document.getElementById('xp-bar');
    this.levelUpMsg = document.getElementById('level-up-msg');
    this.badgeMsg = document.getElementById('badge-msg');
    this.initialized = false;
  }

  init() {
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.index = i;
      this.inventoryBar.appendChild(slot);
    }
    this.initialized = true;
  }

  update(dayNight, player, cheatMessage, cheatTimer, crafting, gumsworth, progression) {
    if (!this.initialized) return;

    // Cheat code message
    if (this.cheatMessageEl) {
      if (cheatTimer > 0 && cheatMessage) {
        this.cheatMessageEl.style.display = 'block';
        this.cheatMessageEl.textContent = cheatMessage;
        this.cheatMessageEl.style.opacity = Math.min(cheatTimer * 2, 1);
      } else {
        this.cheatMessageEl.style.display = 'none';
      }
    }

    // Damage flash overlay
    if (this.damageOverlay) {
      this.damageOverlay.style.opacity = player.damageFlash > 0 ? Math.min(player.damageFlash, 0.8) : 0;
    }

    // Shelter indicator
    if (this.shelterIndicator) {
      this.shelterIndicator.style.display = player.inShelter ? 'block' : 'none';
    }

    // NPC indicator
    if (this.npcIndicator && gumsworth) {
      this.npcIndicator.style.display = gumsworth.interactable ? 'block' : 'none';
    }

    // Death screen
    if (this.deathScreen) {
      if (player.isDead) {
        this.deathScreen.style.display = 'flex';
        this.deathRespawn.style.display = player.deathTimer <= 0 ? 'block' : 'none';
      } else {
        this.deathScreen.style.display = 'none';
      }
    }

    // Crafting panel
    if (this.craftingPanel && crafting) {
      if (crafting.isOpen) {
        this.craftingPanel.style.display = 'block';
        this.renderCraftingRecipes(crafting);
      } else {
        this.craftingPanel.style.display = 'none';
      }
    }

    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    this.healthBar.style.width = `${healthPercent}%`;

    if (healthPercent > 50) {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff69b4, #ffb6d5)';
    } else if (healthPercent > 25) {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff9933, #ffcc66)';
    } else {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';
    }

    let healthLabel = 'HEALTH';
    if (player.sugarRush > 0) {
      healthLabel = 'SUGAR RUSH!';
      this.healthText.style.color = '#ffff00';
    } else if (player.sugarCrash > 0) {
      healthLabel = 'SUGAR CRASH...';
      this.healthText.style.color = '#ff6666';
    } else {
      this.healthText.style.color = '#ffb6d5';
    }
    this.healthText.textContent = healthLabel;

    // Day/night indicator
    const phase = dayNight.getPhaseLabel();
    const timeStr = dayNight.formatTimeRemaining();
    this.timeIcon.textContent = phase;
    this.timeRemaining.textContent = timeStr;

    const indicator = document.getElementById('time-indicator');
    if (phase === 'SUNSET') {
      indicator.style.color = '#ff6633';
      this.timeIcon.textContent = 'GET INSIDE!';
    } else if (phase === 'NIGHT') {
      indicator.style.color = '#9966ff';
    } else {
      indicator.style.color = '#ffb6d5';
    }

    // Progression
    if (progression && this.levelTitle) {
      this.levelTitle.textContent = `Lv.${progression.level} ${progression.getTitle()}`;
      this.xpBar.style.width = `${progression.getXpProgress() * 100}%`;

      if (progression.levelUpTimer > 0) {
        this.levelUpMsg.style.display = 'block';
        this.levelUpMsg.textContent = progression.levelUpMessage;
        this.levelUpMsg.style.opacity = Math.min(progression.levelUpTimer, 1);
      } else {
        this.levelUpMsg.style.display = 'none';
      }

      if (progression.badgeTimer > 0) {
        this.badgeMsg.style.display = 'block';
        this.badgeMsg.textContent = progression.badgeMessage;
        this.badgeMsg.style.opacity = Math.min(progression.badgeTimer, 1);
      } else {
        this.badgeMsg.style.display = 'none';
      }
    }

    // Inventory hotbar
    const hotbarItems = this.game.inventory.getHotbarItems();
    const slots = this.inventoryBar.children;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const item = hotbarItems[i];
      slot.className = 'inv-slot' + (item.selected ? ' active' : '');
      if (item.type) {
        slot.innerHTML = `<span style="font-size:8px">${item.name}</span><br><span style="font-size:10px">${item.count}</span>`;
      } else {
        slot.innerHTML = `<span style="font-size:10px;opacity:0.3">${i + 1}</span>`;
      }
    }

    // Minimap (render every 0.5s for performance)
    this.minimapTimer -= 0.016;
    if (this.minimapCtx && this.minimapTimer <= 0) {
      this.minimapTimer = 0.5;
      this.renderMinimap(player);
    }
  }

  renderMinimap(player) {
    const ctx = this.minimapCtx;
    const w = 120, h = 120;
    const scale = 4; // Each pixel = 4 blocks
    const px = Math.floor(player.position.x);
    const pz = Math.floor(player.position.z);
    const world = this.game.world;

    const biomeColors = {
      cotton_candy_forest: '#4de680',
      gumdrop_mountains: '#cc8855',
      frosting_mountains: '#ddeeff',
      bubblegum_swamp: '#ff66cc',
      sprinkle_beach: '#ddbb88',
    };

    const imageData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const wx = px + (x - w / 2) * scale;
        const wz = pz + (y - h / 2) * scale;
        const biome = world.getBiome(wx, wz);
        const hex = biomeColors[biome] || '#4de680';
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const idx = (y * w + x) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 180;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Player dot
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 2, h / 2 - 2, 4, 4);
    ctx.strokeStyle = '#ff69b4';
    ctx.strokeRect(w / 2 - 2, h / 2 - 2, 4, 4);
  }

  renderCraftingRecipes(crafting) {
    const recipes = crafting.getAvailableRecipes();
    let html = '';
    for (const r of recipes) {
      const color = r.canCraft ? '#44ff88' : '#666';
      const cursor = r.canCraft ? 'cursor:pointer;' : '';
      const ingredients = r.ingredients.map(i => {
        const name = BLOCK_NAMES[i.type] || ITEM_NAMES[i.type] || i.type;
        return `${i.count}x ${name}`;
      }).join(' + ');
      const resultName = BLOCK_NAMES[r.result] || ITEM_NAMES[r.result] || r.result;
      html += `<div data-recipe="${r.index}" style="color:${color};padding:6px 4px;border-bottom:1px solid #333;${cursor}" class="craft-recipe">`;
      html += `<span style="color:#ffb6d5">${r.resultCount}x ${resultName}</span>`;
      html += ` <span style="color:#888">← ${ingredients}</span>`;
      html += `</div>`;
    }
    this.craftingRecipes.innerHTML = html;

    // Add click handlers
    this.craftingRecipes.querySelectorAll('.craft-recipe').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.recipe);
        const recipe = recipes[idx];
        if (recipe && recipe.canCraft) {
          crafting.craft(recipes[idx]);
          this.renderCraftingRecipes(crafting);
        }
      });
    });
  }
}
