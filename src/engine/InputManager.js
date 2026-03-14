export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseButtons = { left: false, right: false };
    this.mouseDelta = { x: 0, y: 0 };
    this.scrollDelta = 0;

    // Track single-press actions (consume once)
    this._justPressed = {};

    document.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) {
        this._justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseButtons.left = true;
      if (e.button === 2) this.mouseButtons.right = true;
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseButtons.left = false;
      if (e.button === 2) this.mouseButtons.right = false;
    });

    document.addEventListener('wheel', (e) => {
      this.scrollDelta += Math.sign(e.deltaY);
    });

    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Returns true only once per key press
  justPressed(code) {
    if (this._justPressed[code]) {
      this._justPressed[code] = false;
      return true;
    }
    return false;
  }

  isDown(code) {
    return !!this.keys[code];
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }

  consumeScroll() {
    const s = this.scrollDelta;
    this.scrollDelta = 0;
    return s;
  }
}
