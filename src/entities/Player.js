import * as THREE from 'three';
import { WEAPON_STATS } from '../world/BlockTypes.js';

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
    this.inShelter = false;
    this.isDead = false;
    this.deathTimer = 0;
    this.spawnPoint = new THREE.Vector3(8, 30, 8);

    // Combat
    this.attackTimer = 0;
    this.isAttacking = false;
    this.attackAnim = 0; // 0 to 1 animation progress

    // Damage flash
    this.damageFlash = 0;

    // Eat feedback
    this.eatMessage = '';
    this.eatMessageTimer = 0;

    // Marshmallow flashlight
    this.flashlight = new THREE.SpotLight(0xffddaa, 0, 30, Math.PI / 4.5, 0.6, 1.5);
    this.flashlightOn = false;
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Hand/weapon visuals
    this.hand = new THREE.Group();
    this.scene.add(this.hand);

    // Lollipop Axe model: stick + round candy head
    this.axeModel = new THREE.Group();
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    stick.rotation.x = Math.PI / 2;
    const candy = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.3, emissive: 0xff69b4, emissiveIntensity: 0.1 })
    );
    candy.position.z = -0.3;
    this.axeModel.add(stick, candy);

    // Gumball Launcher model: tube + barrel
    this.launcherModel = new THREE.Group();
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x7b68ee, roughness: 0.3 })
    );
    tube.rotation.x = Math.PI / 2;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.06, 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0xffb6d5, roughness: 0.3 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.3;
    this.launcherModel.add(tube, barrel);

    // Candy Cane Sword model: striped blade + handle
    this.swordModel = new THREE.Group();
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.3, emissive: 0xff4444, emissiveIntensity: 0.1 })
    );
    const bladeStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.03, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    blade.rotation.x = Math.PI / 2;
    bladeStripe.rotation.x = Math.PI / 2;
    const swordHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3, metalness: 0.4 })
    );
    swordHandle.rotation.x = Math.PI / 2;
    swordHandle.position.z = 0.35;
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.3, metalness: 0.4 })
    );
    guard.position.z = 0.25;
    this.swordModel.add(blade, bladeStripe, swordHandle, guard);

    // Bare fist model
    this.fistModel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 })
    );

    this.hand.add(this.axeModel);
    this.currentWeaponModel = null;

    // Projectiles
    this.projectiles = [];
    this._trailGeo = new THREE.SphereGeometry(0.06, 4, 4); // Shared trail geometry

    // Reusable vectors (avoid allocations every frame)
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._handDir = new THREE.Vector3();
    this._handRight = new THREE.Vector3();
    this._handPos = new THREE.Vector3();
    this._flashDir = new THREE.Vector3();

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

    // Death state
    if (this.isDead) {
      this.deathTimer = Math.max(0, this.deathTimer - delta);
      this.hand.visible = false;
      // Camera slowly drifts up
      this.camera.position.y += delta * 0.5;
      this.camera.rotation.z += delta * 0.1;
      if (this.input.justPressed('Space') && this.deathTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.hand.visible = true;
    this.handleLook();
    this.handleMovement(delta);
    this.handleActions(delta);
    this.updateFlashlight();
    this.updateBuffs(delta);
    this.updateHand(delta);
    this.updateProjectiles(delta);
    // Throttle shelter check (expensive — many isSolid calls)
    this._shelterTimer = (this._shelterTimer || 0) - delta;
    if (this._shelterTimer <= 0) {
      this._shelterTimer = 0.5;
      this.inShelter = this.world.isInsideShelter(this.position.x, this.position.y, this.position.z);
    }

    // Camera
    this.camera.position.set(this.position.x, this.position.y + PLAYER_HEIGHT, this.position.z);
    this.camera.rotation.z = 0;

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
    const forward = this._forward;
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = this._right;
    right.crossVectors(forward, this._up).normalize();

    const moveDir = this._moveDir.set(0, 0, 0);
    if (this.input.isDown('KeyW')) moveDir.add(forward);
    if (this.input.isDown('KeyS')) moveDir.sub(forward);
    if (this.input.isDown('KeyD')) moveDir.add(right);
    if (this.input.isDown('KeyA')) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) moveDir.normalize();

    let speed = MOVE_SPEED;
    if (this.progression) speed *= this.progression.getSpeedBonus();
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
      if (this.sound) this.sound.playJump();
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
    // Unstuck — R key: lift player above terrain and drop safely (like Lakitu in Mario Kart)
    if (this.input.justPressed('KeyR')) {
      this.unstuck();
    }

    // Flashlight
    if (this.input.justPressed('KeyF')) {
      this.flashlightOn = !this.flashlightOn;
    }

    // Eat cotton candy (E key) — works even at full health for sugar rush
    if (this.input.justPressed('KeyE')) {
      const count = this.inventory.getCount('cotton_candy_wood');
      if (count > 0) {
        this.inventory.remove('cotton_candy_wood', 1);
        // Apply level-based max health
        const effectiveMax = this.progression ? this.maxHealth + this.progression.getMaxHealthBonus() : this.maxHealth;
        this.health = Math.min(effectiveMax, this.health + 20);
        if (this.sound) this.sound.playEat();
        if (this.progression) this.progression.onCandyEaten();
        this.sugarRush += 5;
        this.eatMessage = this.health >= this.maxHealth ? 'YUM! Sugar Rush!' : `+20 HP! (${Math.round(this.health)}/${this.maxHealth})`;
        this.eatMessageTimer = 1.5;
        if (this.sugarRush > 15) {
          this.sugarCrash = 15;
          this.sugarRush = 0;
          this.eatMessage = 'SUGAR CRASH! Too much candy!';
          this.eatMessageTimer = 2;
        }
      }
    }
    // Eat message timer
    if (this.eatMessageTimer > 0) this.eatMessageTimer -= delta;

    // Attack cooldown
    this.attackTimer = Math.max(0, this.attackTimer - delta);

    // Left click = attack only when weapon is selected
    const selectedIsWeapon = this.inventory.getSelectedWeaponStats() !== null;
    if (this.input.mouseButtons.left && this.attackTimer <= 0 && selectedIsWeapon) {
      const weaponStats = this.inventory.getSelectedWeaponStats();
      this.attackTimer = weaponStats ? weaponStats.cooldown : ATTACK_COOLDOWN;
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

    const weaponStats = this.inventory.getSelectedWeaponStats();

    // Ranged weapon — shoot projectile
    if (weaponStats && weaponStats.type === 'ranged') {
      this.shootProjectile(origin.clone(), dir.clone(), weaponStats);
      if (this.sound) this.sound.playShoot();
      return;
    }

    if (this.sound) this.sound.playSwing();

    // Melee attack — scale damage with level
    const dmgMult = this.progression ? this.progression.getDamageMultiplier() : 1;
    const treeDamage = weaponStats ? weaponStats.treeDamage : 1;
    const monsterDamage = Math.round((weaponStats ? weaponStats.monsterDamage : ATTACK_DAMAGE) * dmgMult);
    const range = weaponStats ? weaponStats.range : ATTACK_RANGE;

    // Check for tree chopping first
    const tree = this.world.findTreeNear(
      origin.clone().addScaledVector(dir, 2),
      range
    );

    if (tree && treeDamage > 0) {
      tree.trunk.userData.health -= treeDamage;
      if (this.sound) this.sound.playChopTree();

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
        this.inventory.add('cotton_candy_wood', 3 + Math.floor(Math.random() * 3));
        this.world.removeTree(tree);
        if (this.progression) this.progression.onTreeChopped();
      }
      return;
    }

    // Melee attack monsters
    if (this.monsterSpawner) {
      const hit = this.monsterSpawner.attackMonstersInRange(origin, dir, range, monsterDamage);
      if (hit) {
        if (this.particles) this.particles.spawnHitEffect(origin.clone().addScaledVector(dir, 2.5), 0xffffff);
        if (this.sound) this.sound.playHit();
      }
    }

    // Attack boss if in range
    if (this.bossTaffy && this.bossTaffy.active) {
      const bossPos = this.bossTaffy.group.position;
      const toBoss = new THREE.Vector3().subVectors(bossPos, origin);
      if (toBoss.length() < range + 2) {
        this.bossTaffy.takeDamage(monsterDamage);
        if (this.sound) this.sound.playHit();
        if (this.particles) {
          this.particles.spawnHitEffect(bossPos.clone().add(new THREE.Vector3(0, 3, 0)), 0xcc44ff);
        }
        if (this.bossTaffy.defeated) {
          this.inventory.add('crystal_sugar', 20);
          this.inventory.add('rainbow_block', 10);
          if (this.progression) this.progression.onBossDefeated();
        }
      }
    }
  }

  shootProjectile(origin, dir, stats) {
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const colors = [0xff69b4, 0x7b68ee, 0xff5252, 0x44ff88, 0xffff44];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin).addScaledVector(dir, 1);
    this.scene.add(mesh);

    const light = new THREE.PointLight(color, 0.5, 5);
    light.position.copy(mesh.position);
    this.scene.add(light);

    this.projectiles.push({
      mesh,
      light,
      dir: dir.clone(),
      speed: stats.projectileSpeed,
      damage: stats.monsterDamage,
      life: 2,
    });
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;

      p.mesh.position.addScaledVector(p.dir, p.speed * delta);
      p.light.position.copy(p.mesh.position);

      // Spin the projectile
      p.mesh.rotation.x += delta * 15;
      p.mesh.rotation.z += delta * 10;

      // Spawn trail particle
      p.trailTimer = (p.trailTimer || 0) + delta;
      if (p.trailTimer > 0.03) {
        p.trailTimer = 0;
        const trail = new THREE.Mesh(
          this._trailGeo,
          new THREE.MeshBasicMaterial({ color: p.mesh.material.color.getHex(), transparent: true, opacity: 0.5 })
        );
        trail.position.copy(p.mesh.position);
        this.scene.add(trail);
        if (!p.trails) p.trails = [];
        p.trails.push({ mesh: trail, life: 0.3 });
      }
      // Update trails
      if (p.trails) {
        for (let j = p.trails.length - 1; j >= 0; j--) {
          p.trails[j].life -= delta;
          p.trails[j].mesh.material.opacity = Math.max(0, p.trails[j].life * 1.5);
          p.trails[j].mesh.scale.setScalar(p.trails[j].life * 2);
          if (p.trails[j].life <= 0) {
            this.scene.remove(p.trails[j].mesh);
            p.trails.splice(j, 1);
          }
        }
      }

      // Check monster hit
      const dmgMult = this.progression ? this.progression.getDamageMultiplier() : 1;
      const scaledDamage = Math.round(p.damage * dmgMult);
      let hit = false;
      if (this.monsterSpawner) {
        for (const monster of this.monsterSpawner.monsters) {
          const dist = p.mesh.position.distanceTo(monster.group.position);
          if (dist < 1.5) {
            monster.health -= scaledDamage;
            monster.group.position.addScaledVector(p.dir, 1.0);
            if (this.particles) this.particles.spawnHitEffect(p.mesh.position.clone(), 0xff69b4);
            if (this.sound) this.sound.playHit();
            hit = true;
            break;
          }
        }
      }

      // Check boss hit
      if (!hit && this.bossTaffy && this.bossTaffy.active) {
        const dist = p.mesh.position.distanceTo(this.bossTaffy.group.position);
        if (dist < 3) {
          this.bossTaffy.takeDamage(scaledDamage);
          if (this.particles) this.particles.spawnHitEffect(p.mesh.position.clone(), 0xcc44ff);
          if (this.sound) this.sound.playHit();
          hit = true;
          if (this.bossTaffy.defeated) {
            this.inventory.add('crystal_sugar', 20);
            this.inventory.add('rainbow_block', 10);
            if (this.progression) this.progression.onBossDefeated();
          }
        }
      }

      if (p.life <= 0 || hit) {
        this.scene.remove(p.mesh);
        this.scene.remove(p.light);
        p.light.dispose();
        if (p.trails) {
          for (const t of p.trails) this.scene.remove(t.mesh);
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  updateHand(delta) {
    // Animate attack swing
    if (this.attackAnim > 0) {
      this.attackAnim = Math.max(0, this.attackAnim - delta * 6);
    }

    // Swap weapon model based on selected item
    const selected = this.inventory.getSelectedItem();
    let targetModel = this.fistModel;
    if (selected === 'lollipop_axe') targetModel = this.axeModel;
    else if (selected === 'gumball_launcher') targetModel = this.launcherModel;
    else if (selected === 'candy_cane_sword') targetModel = this.swordModel;

    if (this.currentWeaponModel !== targetModel) {
      while (this.hand.children.length) this.hand.remove(this.hand.children[0]);
      this.hand.add(targetModel);
      this.currentWeaponModel = targetModel;
    }

    // Position hand in front of camera
    const dir = this._handDir;
    this.camera.getWorldDirection(dir);
    const right = this._handRight;
    right.crossVectors(dir, this._up).normalize();

    const handPos = this._handPos.copy(this.camera.position)
      .addScaledVector(dir, 0.6)
      .addScaledVector(right, 0.35);
    handPos.y -= 0.3;

    // Swing animation
    if (this.attackAnim > 0) {
      const swing = Math.sin(this.attackAnim * Math.PI) * 0.4;
      handPos.y -= swing * 0.3;
      handPos.addScaledVector(dir, swing * 0.2);
    }

    this.hand.position.copy(handPos);
    // Reuse _forward for lookAt target to avoid clone
    this._forward.copy(handPos).add(dir);
    this.hand.lookAt(this._forward);
  }

  updateFlashlight() {
    this.flashlight.intensity = this.flashlightOn ? 3 : 0;
    if (this.flashlightOn) {
      this.camera.getWorldDirection(this._flashDir);
      this.flashlight.position.copy(this.camera.position);
      this.flashlight.target.position.copy(this.camera.position).addScaledVector(this._flashDir, 10);
    }
  }

  updateBuffs(delta) {
    if (this.sugarRush > 0) this.sugarRush = Math.max(0, this.sugarRush - delta);
    if (this.sugarCrash > 0) this.sugarCrash = Math.max(0, this.sugarCrash - delta);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 1;
    if (this.sound) this.sound.playDamage();
    if (this.health <= 0) {
      this.isDead = true;
      this.deathTimer = 3;
      if (this.sound) this.sound.playDeath();
    }
  }

  unstuck() {
    // Lift player above terrain and drop them — keeps all inventory/progress
    const groundY = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
    this.position.y = groundY + 5; // lift 5 blocks above surface
    this.velocity.set(0, 0, 0);
    this.onGround = false;
    this.eatMessage = 'UNSTUCK! Dropping back in...';
    this.eatMessageTimer = 2;
    if (this.sound) this.sound.playJump();
  }

  respawn() {
    this.isDead = false;
    this.deathTimer = 0;
    this.health = this.maxHealth;
    this.position.copy(this.spawnPoint);
    const groundY = this.world.getSurfaceHeight(this.position.x, this.position.z) + 1;
    this.position.y = groundY;
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.damageFlash = 0;
    this.sugarRush = 0;
    this.sugarCrash = 0;
  }
}
