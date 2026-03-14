import * as THREE from 'three';

const MOVE_SPEED = 7;
const JUMP_FORCE = 9;
const GRAVITY = -25;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.3;
const ATTACK_RANGE = 4;
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN = 0.35;

export class Player {
  constructor(camera, scene, input, world, inventory) {
    this.camera = camera;
    this.scene = scene;
    this.input = input;
    this.world = world;
    this.inventory = inventory;

    this.position = new THREE.Vector3(8, 30, 8);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.spawned = false;

    this.pitch = -0.15;
    this.yaw = 0.5;

    this.health = 100;
    this.maxHealth = 100;
    this.sugarRush = 0;
    this.sugarCrash = 0;

    // Combat
    this.attackTimer = 0;
    this.isAttacking = false;
    this.attackAnim = 0; // 0 to 1 animation progress

    // Damage flash
    this.damageFlash = 0;

    // Marshmallow flashlight
    this.flashlight = new THREE.SpotLight(0xffddaa, 0, 30, Math.PI / 4.5, 0.6, 1.5);
    this.flashlightOn = false;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Hand/weapon visual (simple box for now)
    this.hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.5 })
    );
    this.hand.castShadow = true;
    this.scene.add(this.hand);

    this.camera.position.set(8, 35, 8);
  }

  update(delta) {
    delta = Math.min(delta, 0.1);

    if (!this.spawned) {
      const groundY = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
      this.position.y = groundY;
      this.velocity.y = 0;
      this.onGround = true;
      this.spawned = true;
    }

    this.handleLook();
    this.handleMovement(delta);
    this.handleActions(delta);
    this.updateFlashlight();
    this.updateBuffs(delta);
    this.updateHand(delta);

    // Camera
    this.camera.position.set(this.position.x, this.position.y + PLAYER_HEIGHT, this.position.z);

    // Damage flash
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - delta * 4);
    }
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
    if (this.input.isDown('ShiftLeft')) speed *= 1.4;

    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    if (!this.onGround) {
      this.velocity.y += GRAVITY * delta;
      this.velocity.y = Math.max(this.velocity.y, -35);
    }

    if (this.input.isDown('Space') && this.onGround) {
      this.velocity.y = JUMP_FORCE;
      this.onGround = false;
    }

    // Horizontal collision
    const newX = this.position.x + this.velocity.x * delta;
    const newZ = this.position.z + this.velocity.z * delta;

    if (!this.collidesAt(newX, this.position.y, this.position.z)) {
      this.position.x = newX;
    } else {
      this.velocity.x = 0;
    }

    if (!this.collidesAt(this.position.x, this.position.y, newZ)) {
      this.position.z = newZ;
    } else {
      this.velocity.z = 0;
    }

    // Vertical
    const newY = this.position.y + this.velocity.y * delta;
    if (this.velocity.y <= 0) {
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
      if (!this.collidesAt(this.position.x, newY + PLAYER_HEIGHT, this.position.z)) {
        this.position.y = newY;
      } else {
        this.velocity.y = 0;
      }
      this.onGround = false;
    }

    // Safety
    if (this.position.y < -10) {
      this.position.y = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }

  getGroundAt(x, z) {
    for (let y = Math.ceil(this.position.y + 2); y >= 0; y--) {
      if (this.world.isSolid(x, y, z)) return y + 1;
    }
    return this.world.getSurfaceHeight(x, z) + 1;
  }

  collidesAt(x, y, z) {
    for (let dy = 0; dy < PLAYER_HEIGHT; dy += 0.4) {
      for (const [dx, dz] of [[PLAYER_RADIUS, 0], [-PLAYER_RADIUS, 0], [0, PLAYER_RADIUS], [0, -PLAYER_RADIUS]]) {
        if (this.world.isSolid(x + dx, y + dy, z + dz)) return true;
      }
    }
    return false;
  }

  handleActions(delta) {
    // Flashlight
    if (this.input.justPressed('KeyF')) {
      this.flashlightOn = !this.flashlightOn;
    }

    // Eat cotton candy
    if (this.input.justPressed('KeyE')) {
      const count = this.inventory.getCount('cotton_candy_wood');
      if (count > 0 && this.health < this.maxHealth) {
        this.inventory.remove('cotton_candy_wood', 1);
        this.health = Math.min(this.maxHealth, this.health + 20);
        this.sugarRush += 5;
        if (this.sugarRush > 15) {
          this.sugarCrash = 15;
          this.sugarRush = 0;
        }
      }
    }

    // Attack cooldown
    this.attackTimer = Math.max(0, this.attackTimer - delta);

    // Left click = attack (when not in block-break mode)
    if (this.input.mouseButtons.left && this.attackTimer <= 0) {
      this.attackTimer = ATTACK_COOLDOWN;
      this.isAttacking = true;
      this.attackAnim = 1;
      this.performAttack();
    }

    // Scroll / number keys
    const scroll = this.input.consumeScroll();
    if (scroll !== 0) this.inventory.changeSlot(scroll);
    for (let i = 1; i <= 9; i++) {
      if (this.input.justPressed(`Digit${i}`)) this.inventory.setSlot(i - 1);
    }
  }

  performAttack() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = this.camera.position.clone();

    // Check for tree chopping first
    const tree = this.world.findTreeNear(
      origin.clone().addScaledVector(dir, 2),
      ATTACK_RANGE
    );

    if (tree) {
      tree.trunk.userData.health -= 1;

      // Visual feedback — flash the trunk
      const origColor = tree.trunk.material.color.getHex();
      tree.trunk.material.color.setHex(0xffffff);
      tree.trunk.material.emissive.setHex(0xffffff);
      tree.trunk.material.emissiveIntensity = 0.5;
      setTimeout(() => {
        if (tree.trunk.material) {
          tree.trunk.material.color.setHex(origColor);
          tree.trunk.material.emissive.setHex(0x000000);
          tree.trunk.material.emissiveIntensity = 0;
        }
      }, 100);

      if (this.particles) {
        this.particles.spawnHitEffect(origin.clone().addScaledVector(dir, 2), 0xff8ec4);
      }

      if (tree.trunk.userData.health <= 0) {
        // Tree destroyed — give resources
        this.inventory.add('cotton_candy_wood', 3 + Math.floor(Math.random() * 3));
        this.world.removeTree(tree);
      }
      return;
    }

    // Attack monsters
    if (this.monsterSpawner) {
      const hit = this.monsterSpawner.attackMonstersInRange(origin, dir, ATTACK_RANGE, ATTACK_DAMAGE);
      if (hit && this.particles) {
        this.particles.spawnHitEffect(origin.clone().addScaledVector(dir, 2.5), 0xffffff);
      }
    }
  }

  updateHand(delta) {
    // Animate attack swing
    if (this.attackAnim > 0) {
      this.attackAnim = Math.max(0, this.attackAnim - delta * 6);
    }

    // Position hand in front of camera
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3();
    right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    const handPos = this.camera.position.clone()
      .addScaledVector(dir, 0.6)
      .addScaledVector(right, 0.35)
      .add(new THREE.Vector3(0, -0.3, 0));

    // Swing animation
    if (this.attackAnim > 0) {
      const swing = Math.sin(this.attackAnim * Math.PI) * 0.4;
      handPos.y -= swing * 0.3;
      handPos.addScaledVector(dir, swing * 0.2);
    }

    this.hand.position.copy(handPos);
    this.hand.lookAt(handPos.clone().add(dir));
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
    this.damageFlash = 1;
  }
}
