import * as THREE from 'three';

const MOVE_SPEED = 6;
const JUMP_FORCE = 8;
const GRAVITY = -20;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;

export class Player {
  constructor(camera, scene, input, world, inventory) {
    this.camera = camera;
    this.scene = scene;
    this.input = input;
    this.world = world;
    this.inventory = inventory;

    // Position and physics
    this.position = new THREE.Vector3(8, 20, 8);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;

    // Camera rotation
    this.pitch = 0; // up/down
    this.yaw = 0;   // left/right

    // Player stats
    this.health = 100;
    this.maxHealth = 100;
    this.sugarRush = 0; // sugar rush timer
    this.sugarCrash = 0; // sugar crash timer

    // Marshmallow flashlight
    this.flashlight = new THREE.SpotLight(0xffddaa, 0, 20, Math.PI / 5, 0.5);
    this.flashlight.castShadow = true;
    this.flashlightOn = false;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Place camera at start position
    this.camera.position.copy(this.position);
  }

  update(delta) {
    this.handleLook();
    this.handleMovement(delta);
    this.handleActions();
    this.updateFlashlight();
    this.updateBuffs(delta);

    // Update camera
    this.camera.position.copy(this.position);
    this.camera.position.y += PLAYER_HEIGHT;
  }

  handleLook() {
    const mouseDelta = this.input.consumeMouseDelta();
    this.yaw -= mouseDelta.x * MOUSE_SENSITIVITY;
    this.pitch -= mouseDelta.y * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  handleMovement(delta) {
    // Get move direction relative to camera
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

    if (moveDir.length() > 0) moveDir.normalize();

    // Apply speed (with sugar rush/crash modifiers)
    let speed = MOVE_SPEED;
    if (this.sugarRush > 0) speed *= 1.5;
    if (this.sugarCrash > 0) speed *= 0.5;

    // Sprint
    if (this.input.isDown('ShiftLeft')) speed *= 1.5;

    // Horizontal movement
    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    // Gravity
    this.velocity.y += GRAVITY * delta;

    // Jump
    if (this.input.isDown('Space') && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }

    // Apply velocity with collision
    const newPos = this.position.clone();
    newPos.x += this.velocity.x * delta;
    newPos.y += this.velocity.y * delta;
    newPos.z += this.velocity.z * delta;

    // Simple collision detection
    this.resolveCollision(newPos);

    this.position.copy(newPos);

    // Ground check
    const groundHeight = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
    if (this.position.y <= groundHeight) {
      this.position.y = groundHeight;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }

  resolveCollision(newPos) {
    // Check horizontal collisions
    const checkPoints = [
      [PLAYER_RADIUS, 0], [-PLAYER_RADIUS, 0],
      [0, PLAYER_RADIUS], [0, -PLAYER_RADIUS],
    ];

    for (let dy = 0; dy <= PLAYER_HEIGHT; dy += 0.5) {
      for (const [dx, dz] of checkPoints) {
        if (this.world.isSolid(newPos.x + dx, newPos.y + dy, newPos.z + dz)) {
          // Push back
          if (dx !== 0) newPos.x = this.position.x;
          if (dz !== 0) newPos.z = this.position.z;
        }
      }
    }
  }

  handleActions() {
    // Toggle flashlight with F
    if (this.input.justPressed('KeyF')) {
      this.flashlightOn = !this.flashlightOn;
    }

    // Eat cotton candy (heal) with E when looking at canopy or holding cotton candy
    if (this.input.justPressed('KeyE')) {
      const cottonCandy = this.inventory.getCount('cotton_candy_wood');
      if (cottonCandy > 0 && this.health < this.maxHealth) {
        this.inventory.remove('cotton_candy_wood', 1);
        this.health = Math.min(this.maxHealth, this.health + 20);
        this.sugarRush += 5; // 5 seconds of sugar rush

        // Too much sugar = crash
        if (this.sugarRush > 15) {
          this.sugarCrash = 15;
          this.sugarRush = 0;
        }
      }
    }

    // Scroll to change inventory slot
    const scroll = this.input.consumeScroll();
    if (scroll !== 0) {
      this.inventory.changeSlot(scroll);
    }

    // Number keys for inventory slots
    for (let i = 1; i <= 9; i++) {
      if (this.input.justPressed(`Digit${i}`)) {
        this.inventory.setSlot(i - 1);
      }
    }
  }

  updateFlashlight() {
    this.flashlight.intensity = this.flashlightOn ? 2 : 0;

    if (this.flashlightOn) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.flashlight.position.copy(this.camera.position);
      this.flashlight.target.position.copy(this.camera.position).add(dir.multiplyScalar(10));
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
