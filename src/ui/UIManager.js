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

  update(dayNight, player, cheatMessage, cheatTimer, crafting, gumsworth) {
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
