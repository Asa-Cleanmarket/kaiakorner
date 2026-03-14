export class UIManager {
  constructor(game) {
    this.game = game;
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.timeIcon = document.getElementById('time-icon');
    this.timeRemaining = document.getElementById('time-remaining');
    this.inventoryBar = document.getElementById('inventory-bar');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.initialized = false;
  }

  init() {
    // Create inventory slots
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.index = i;
      this.inventoryBar.appendChild(slot);
    }
    this.initialized = true;
  }

  update(dayNight, player) {
    if (!this.initialized) return;

    // Damage flash overlay
    if (this.damageOverlay) {
      this.damageOverlay.style.opacity = player.damageFlash > 0 ? Math.min(player.damageFlash, 0.8) : 0;
    }

    // Health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    this.healthBar.style.width = `${healthPercent}%`;

    // Health bar color based on health level
    if (healthPercent > 50) {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff69b4, #ffb6d5)';
    } else if (healthPercent > 25) {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff9933, #ffcc66)';
    } else {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff3333, #ff6666)';
    }

    // Sugar rush/crash indicator
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

    // Color based on phase
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
}
