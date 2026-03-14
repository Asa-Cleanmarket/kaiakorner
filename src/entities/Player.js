import * as THREE from 'three';

const MOVE_SPEED = 6;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.3;

export class Player {
  constructor(camera, scene, input, world, inventory) {
    this.camera = camera;
    this.scene = scene;
    this.input = input;
    this.world = world;
    this.inventory = inventory;

    // Position = feet position. Will be set properly on first update.
    this.position = new THREE.Vector3(8, 30, 8); // start high, gravity will place us
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.spawned = false;

    // Camera rotation — start looking slightly downward at the terrain
    this.pitch = -0.2;
    this.yaw = 0.5;

    // Player stats
    this.health = 100;
    this.maxHealth = 100;
    this.sugarRush = 0;
    this.sugarCrash = 0;

    // Marshmallow flashlight
    this.flashlight = new THREE.SpotLight(0xffddaa, 0, 25, Math.PI / 5, 0.5, 1);
    this.flashlightOn = false;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    this.camera.position.set(8, 35, 8);
  }

  update(delta) {
    // Clamp delta to prevent physics explosions on tab-switch
    delta = Math.min(delta, 0.1);

    // On first frame, snap to ground
    if (!this.spawned) {
      const groundY = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
      this.position.y = groundY;
      this.velocity.y = 0;
      this.onGround = true;
      this.spawned = true;
    }

    this.handleLook();
    this.handleMovement(delta);
    this.handleActions();
    this.updateFlashlight();
    this.updateBuffs(delta);

    // Camera at eye level
    this.camera.position.set(
      this.position.x,
      this.position.y + PLAYER_HEIGHT,
      this.position.z
    );
  }

  handleLook() {
    const mouseDelta = this.input.consumeMouseDelta();
    this.yaw -= mouseDelta.x * MOUSE_SENSITIVITY;
    this.pitch -= mouseDelta.y * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  handleMovement(delta) {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();
    if (this.input.isDown('KeyW')) moveDir.add(forward);
    if (this.input.isDown('KeyS')) moveDir.sub(forward);
    if (this.input.isDown('KeyD')) moveDir.add(right);
    if (this.input.isDown('KeyA')) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) moveDir.normalize();

    let speed = MOVE_SPEED;
    if (this.sugarRush > 0) speed *= 1.5;
    if (this.sugarCrash > 0) speed *= 0.5;
    if (this.input.isDown('ShiftLeft')) speed *= 1.5;

    // Apply horizontal velocity
    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    // Gravity
    if (!this.onGround) {
      this.velocity.y += GRAVITY * delta;
      this.velocity.y = Math.max(this.velocity.y, -30); // terminal velocity
    }

    // Jump
    if (this.input.isDown('Space') && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }

    // Move horizontally with collision
    const newX = this.position.x + this.velocity.x * delta;
    const newZ = this.position.z + this.velocity.z * delta;

    // Check X movement
    if (!this.collidesAt(newX, this.position.y, this.position.z)) {
      this.position.x = newX;
    }

    // Check Z movement
    if (!this.collidesAt(this.position.x, this.position.y, newZ)) {
      this.position.z = newZ;
    }

    // Move vertically
    const newY = this.position.y + this.velocity.y * delta;
    if (this.velocity.y < 0) {
      // Falling — check ground
      const groundY = this.getGroundAt(this.position.x, this.position.z);
      if (newY <= groundY) {
        this.position.y = groundY;
        this.velocity.y = 0;
        this.onGround = true;
      } else {
        this.position.y = newY;
        this.onGround = false;
      }
    } else {
      // Rising — check ceiling
      if (!this.collidesAt(this.position.x, newY, this.position.z)) {
        this.position.y = newY;
      } else {
        this.velocity.y = 0;
      }
      this.onGround = false;
    }

    // Safety: don't fall below world
    if (this.position.y < -10) {
      const groundY = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
      this.position.y = groundY;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }

  // Get the Y position of the ground at x,z (top of highest solid block + 1)
  getGroundAt(x, z) {
    // Check from current position down
    for (let y = Math.ceil(this.position.y); y >= 0; y--) {
      if (this.world.isSolid(x, y, z)) {
        return y + 1;
      }
    }
    // Fallback to height map
    return this.world.getSurfaceHeight(x, z) + 1;
  }

  collidesAt(x, y, z) {
    // Check several points around the player capsule
    for (let dy = 0; dy < PLAYER_HEIGHT; dy += 0.5) {
      for (const [dx, dz] of [[PLAYER_RADIUS, 0], [-PLAYER_RADIUS, 0], [0, PLAYER_RADIUS], [0, -PLAYER_RADIUS]]) {
        if (this.world.isSolid(x + dx, y + dy, z + dz)) {
          return true;
        }
      }
    }
    return false;
  }

  handleActions() {
    if (this.input.justPressed('KeyF')) {
      this.flashlightOn = !this.flashlightOn;
    }

    if (this.input.justPressed('KeyE')) {
      const cottonCandy = this.inventory.getCount('cotton_candy_wood');
      if (cottonCandy > 0 && this.health < this.maxHealth) {
        this.inventory.remove('cotton_candy_wood', 1);
        this.health = Math.min(this.maxHealth, this.health + 20);
        this.sugarRush += 5;
        if (this.sugarRush > 15) {
          this.sugarCrash = 15;
          this.sugarRush = 0;
        }
      }
    }

    const scroll = this.input.consumeScroll();
    if (scroll !== 0) {
      this.inventory.changeSlot(scroll);
    }

    for (let i = 1; i <= 9; i++) {
      if (this.input.justPressed(`Digit${i}`)) {
        this.inventory.setSlot(i - 1);
      }
    }
  }

  updateFlashlight() {
    this.flashlight.intensity = this.flashlightOn ? 3 : 0;

    if (this.flashlightOn) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.flashlight.position.copy(this.camera.position);
      this.flashlight.target.position.copy(this.camera.position).addScaledVector(dir, 10);
    }
  }

  updateBuffs(delta) {
    if (this.sugarRush > 0) this.sugarRush = Math.max(0, this.sugarRush - delta);
    if (this.sugarCrash > 0) this.sugarCrash = Math.max(0, this.sugarCrash - delta);
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }
}
