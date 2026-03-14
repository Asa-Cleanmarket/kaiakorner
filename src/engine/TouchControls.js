// Virtual joystick + touch look + action buttons for mobile/tablet
export class TouchControls {
  constructor(input) {
    this.input = input;
    this.active = false;

    // Joystick state
    this.joystickActive = false;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickPos = { x: 0, y: 0 };
    this.joystickTouchId = null;

    // Look state
    this.lookTouchId = null;
    this.lookLast = { x: 0, y: 0 };

    // Build the UI
    this._createUI();
    this._setupEvents();
  }

  _createUI() {
    // Container for all touch controls
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:20;pointer-events:none;';
    document.body.appendChild(this.container);

    // === LEFT SIDE: Virtual Joystick ===
    this.joystickArea = document.createElement('div');
    this.joystickArea.style.cssText = 'position:absolute;bottom:20px;left:20px;width:140px;height:140px;pointer-events:auto;touch-action:none;';
    this.container.appendChild(this.joystickArea);

    this.joystickBase = document.createElement('div');
    this.joystickBase.style.cssText = 'width:120px;height:120px;border-radius:50%;background:rgba(255,105,180,0.15);border:2px solid rgba(255,105,180,0.4);position:absolute;bottom:10px;left:10px;';
    this.joystickArea.appendChild(this.joystickBase);

    this.joystickThumb = document.createElement('div');
    this.joystickThumb.style.cssText = 'width:50px;height:50px;border-radius:50%;background:rgba(255,105,180,0.5);border:2px solid rgba(255,182,213,0.8);position:absolute;bottom:45px;left:45px;transition:none;';
    this.joystickArea.appendChild(this.joystickThumb);

    // === RIGHT SIDE: Action Buttons ===
    const btnStyle = 'pointer-events:auto;touch-action:none;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"Courier New",monospace;font-weight:bold;font-size:11px;color:#fff;text-shadow:0 0 4px rgba(0,0,0,0.8);user-select:none;-webkit-user-select:none;';

    // Jump button (bottom right)
    this.jumpBtn = document.createElement('div');
    this.jumpBtn.style.cssText = btnStyle + 'position:absolute;bottom:20px;right:20px;background:rgba(68,255,136,0.3);border:2px solid rgba(68,255,136,0.6);';
    this.jumpBtn.textContent = 'JUMP';
    this.container.appendChild(this.jumpBtn);

    // Attack button (right side, above jump)
    this.attackBtn = document.createElement('div');
    this.attackBtn.style.cssText = btnStyle + 'position:absolute;bottom:90px;right:85px;background:rgba(255,105,180,0.3);border:2px solid rgba(255,105,180,0.6);';
    this.attackBtn.textContent = 'ATK';
    this.container.appendChild(this.attackBtn);

    // Place/Break button
    this.placeBtn = document.createElement('div');
    this.placeBtn.style.cssText = btnStyle + 'position:absolute;bottom:90px;right:15px;background:rgba(123,104,238,0.3);border:2px solid rgba(123,104,238,0.6);font-size:9px;';
    this.placeBtn.textContent = 'PLACE';
    this.container.appendChild(this.placeBtn);

    // Eat button (top of action cluster)
    this.eatBtn = document.createElement('div');
    this.eatBtn.style.cssText = btnStyle + 'position:absolute;bottom:160px;right:50px;width:50px;height:50px;background:rgba(255,204,0,0.3);border:2px solid rgba(255,204,0,0.6);font-size:10px;';
    this.eatBtn.textContent = 'EAT';
    this.container.appendChild(this.eatBtn);

    // Craft button (above eat)
    this.craftBtn = document.createElement('div');
    this.craftBtn.style.cssText = btnStyle + 'position:absolute;bottom:220px;right:50px;width:50px;height:50px;background:rgba(255,170,51,0.3);border:2px solid rgba(255,170,51,0.6);font-size:9px;';
    this.craftBtn.textContent = 'CRAFT';
    this.container.appendChild(this.craftBtn);

    // Inventory slot buttons (bottom center, smaller)
    this.slotBtns = [];
    const slotContainer = document.createElement('div');
    slotContainer.style.cssText = 'position:absolute;bottom:2px;left:50%;transform:translateX(-50%);display:flex;gap:2px;pointer-events:auto;touch-action:none;';
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement('div');
      btn.style.cssText = 'width:30px;height:24px;border-radius:4px;background:rgba(20,10,40,0.6);border:1px solid rgba(123,104,238,0.4);display:flex;align-items:center;justify-content:center;font-family:"Courier New",monospace;font-size:9px;color:rgba(255,182,213,0.6);user-select:none;-webkit-user-select:none;';
      btn.textContent = i + 1;
      btn.dataset.slot = i;
      slotContainer.appendChild(btn);
      this.slotBtns.push(btn);
    }
    this.container.appendChild(slotContainer);

    // Flashlight button (top right)
    this.flashBtn = document.createElement('div');
    this.flashBtn.style.cssText = btnStyle + 'position:absolute;top:60px;right:15px;width:40px;height:40px;background:rgba(255,221,170,0.2);border:2px solid rgba(255,221,170,0.5);font-size:14px;';
    this.flashBtn.textContent = 'F';
    this.container.appendChild(this.flashBtn);

    // Unstuck button (top right, below flashlight)
    this.unstuckBtn = document.createElement('div');
    this.unstuckBtn.style.cssText = btnStyle + 'position:absolute;top:110px;right:15px;width:40px;height:40px;background:rgba(68,187,255,0.2);border:2px solid rgba(68,187,255,0.5);font-size:8px;';
    this.unstuckBtn.textContent = 'FIX';
    this.container.appendChild(this.unstuckBtn);
  }

  _setupEvents() {
    // Prevent default on all touch controls to avoid scrolling
    this.container.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    this.container.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    // === JOYSTICK ===
    this.joystickArea.addEventListener('touchstart', e => {
      if (this.joystickTouchId !== null) return;
      const t = e.changedTouches[0];
      this.joystickTouchId = t.identifier;
      const rect = this.joystickBase.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this._updateJoystick(t.clientX, t.clientY);
    });

    // === LOOK (touch on canvas / right side) ===
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          // Only use right-half touches for look, left-half can also be look
          if (this.lookTouchId === null) {
            this.lookTouchId = t.identifier;
            this.lookLast = { x: t.clientX, y: t.clientY };
          }
        }
      }, { passive: false });

      canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          if (t.identifier === this.lookTouchId) {
            const dx = t.clientX - this.lookLast.x;
            const dy = t.clientY - this.lookLast.y;
            this.input.mouseDelta.x += dx * 1.2;
            this.input.mouseDelta.y += dy * 1.2;
            this.lookLast = { x: t.clientX, y: t.clientY };
          }
        }
      }, { passive: false });

      canvas.addEventListener('touchend', e => {
        for (const t of e.changedTouches) {
          if (t.identifier === this.lookTouchId) {
            this.lookTouchId = null;
          }
        }
      });
      canvas.addEventListener('touchcancel', e => {
        for (const t of e.changedTouches) {
          if (t.identifier === this.lookTouchId) {
            this.lookTouchId = null;
          }
        }
      });
    }

    // Global touch move/end for joystick
    document.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickTouchId) {
          this._updateJoystick(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    document.addEventListener('touchend', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this._resetJoystick();
        }
      }
    });
    document.addEventListener('touchcancel', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this._resetJoystick();
        }
      }
    });

    // === ACTION BUTTONS ===
    this._holdButton(this.jumpBtn, 'Space');
    this._holdButton(this.attackBtn, '_leftClick');
    this._holdButton(this.placeBtn, '_rightClick');
    this._tapButton(this.eatBtn, 'KeyE');
    this._tapButton(this.craftBtn, 'KeyC');
    this._tapButton(this.flashBtn, 'KeyF');
    this._tapButton(this.unstuckBtn, 'KeyR');

    // Slot buttons
    for (const btn of this.slotBtns) {
      this._tapButton(btn, `Digit${parseInt(btn.dataset.slot) + 1}`);
    }
  }

  _updateJoystick(x, y) {
    const dx = x - this.joystickCenter.x;
    const dy = y - this.joystickCenter.y;
    const maxDist = 45;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * dist;
    const ny = Math.sin(angle) * dist;

    // Move thumb visual
    this.joystickThumb.style.left = (45 + nx) + 'px';
    this.joystickThumb.style.bottom = (45 - ny) + 'px';

    // Map to WASD keys
    const threshold = 15;
    this.input.keys['KeyW'] = ny < -threshold;
    this.input.keys['KeyS'] = ny > threshold;
    this.input.keys['KeyA'] = nx < -threshold;
    this.input.keys['KeyD'] = nx > threshold;

    // Sprint if pushed far
    this.input.keys['ShiftLeft'] = dist > maxDist * 0.85;
  }

  _resetJoystick() {
    this.joystickThumb.style.left = '45px';
    this.joystickThumb.style.bottom = '45px';
    this.input.keys['KeyW'] = false;
    this.input.keys['KeyS'] = false;
    this.input.keys['KeyA'] = false;
    this.input.keys['KeyD'] = false;
    this.input.keys['ShiftLeft'] = false;
  }

  _holdButton(el, key) {
    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (key === '_leftClick') {
        this.input.mouseButtons.left = true;
      } else if (key === '_rightClick') {
        this.input.mouseButtons.right = true;
      } else {
        this.input.keys[key] = true;
        this.input._justPressed[key] = true;
      }
      el.style.transform = 'scale(0.9)';
      el.style.filter = 'brightness(1.5)';
    };
    const release = (e) => {
      e.preventDefault();
      if (key === '_leftClick') {
        this.input.mouseButtons.left = false;
      } else if (key === '_rightClick') {
        this.input.mouseButtons.right = false;
      } else {
        this.input.keys[key] = false;
      }
      el.style.transform = '';
      el.style.filter = '';
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
  }

  _tapButton(el, key) {
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.input.keys[key] = true;
      this.input._justPressed[key] = true;
      el.style.transform = 'scale(0.9)';
      el.style.filter = 'brightness(1.5)';
      setTimeout(() => {
        this.input.keys[key] = false;
        el.style.transform = '';
        el.style.filter = '';
      }, 100);
    }, { passive: false });
  }

  show() {
    this.active = true;
    this.container.style.display = 'block';
  }

  hide() {
    this.active = false;
    this.container.style.display = 'none';
  }
}
