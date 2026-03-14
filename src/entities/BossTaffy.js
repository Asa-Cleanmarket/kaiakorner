import * as THREE from 'three';

const BOSS_HEALTH = 300;
const BOSS_DAMAGE = 20;
const BOSS_SPEED = 3;
const BOSS_RANGE = 5;
const ATTACK_COOLDOWN = 2;
const PHASE_2_HEALTH = 150;
const SPAWN_DISTANCE = 40;

export class BossTaffy {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.active = false;
    this.health = BOSS_HEALTH;
    this.maxHealth = BOSS_HEALTH;
    this.phase = 1;
    this.attackCooldown = 0;
    this.defeated = false;
    this.animPhase = 0;
    this.damageFlash = 0;

    this.group = new THREE.Group();
    this.buildModel();
    this.group.visible = false;

    // Boss health bar element
    this.bossBarEl = document.getElementById('boss-bar');
    this.bossBarFill = document.getElementById('boss-bar-fill');
    this.bossBarName = document.getElementById('boss-bar-name');
  }

  buildModel() {
    // Taffy the Terrible: big taffy-like stretchy monster, purple/pink
    // Base body — stretched blob
    const bodyGeo = new THREE.CapsuleGeometry(1.2, 2.5, 6, 12);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcc44ff, roughness: 0.3, metalness: 0.1,
      emissive: 0xcc44ff, emissiveIntensity: 0.1,
    });
    this.body = new THREE.Mesh(bodyGeo, this.bodyMat);
    this.body.position.y = 2.5;
    this.body.castShadow = true;

    // Head
    const headGeo = new THREE.SphereGeometry(1.0, 8, 6);
    this.headMat = new THREE.MeshStandardMaterial({
      color: 0xdd66ff, roughness: 0.3, metalness: 0.1,
    });
    this.head = new THREE.Mesh(headGeo, this.headMat);
    this.head.position.y = 5.2;
    this.head.castShadow = true;

    // Horns (taffy-stretched)
    const hornGeo = new THREE.ConeGeometry(0.2, 1.2, 5);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xff44aa, roughness: 0.3 });
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.6, 5.9, 0);
    leftHorn.rotation.z = 0.3;
    rightHorn.position.set(0.6, 5.9, 0);
    rightHorn.rotation.z = -0.3;

    // Glowing eyes
    const eyeGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.4, 5.3, 0.8);
    rightEye.position.set(0.4, 5.3, 0.8);

    // Arms (thick, taffy-like)
    const armGeo = new THREE.CapsuleGeometry(0.35, 2, 4, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xbb33ee, roughness: 0.4 });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-1.8, 3.5, 0);
    this.leftArm.rotation.z = 0.5;
    this.rightArm.position.set(1.8, 3.5, 0);
    this.rightArm.rotation.z = -0.5;

    // Crown (because he's a boss)
    const crownGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.4, 6);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00, roughness: 0.2, metalness: 0.6,
      emissive: 0xffcc00, emissiveIntensity: 0.2,
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 6.1;

    // Crown points
    for (let i = 0; i < 5; i++) {
      const pointGeo = new THREE.ConeGeometry(0.12, 0.3, 4);
      const point = new THREE.Mesh(pointGeo, crownMat);
      const angle = (i / 5) * Math.PI * 2;
      point.position.set(Math.cos(angle) * 0.6, 6.4, Math.sin(angle) * 0.6);
      this.group.add(point);
    }

    // Glow
    this.bossGlow = new THREE.PointLight(0xcc44ff, 2, 20);
    this.bossGlow.position.y = 3;

    this.group.add(this.body, this.head, leftHorn, rightHorn,
      leftEye, rightEye, this.leftArm, this.rightArm, crown, this.bossGlow);
  }

  spawn(playerPos) {
    if (this.active || this.defeated) return;
    this.active = true;
    this.health = BOSS_HEALTH;
    this.phase = 1;
    this.group.visible = true;

    const angle = Math.random() * Math.PI * 2;
    const x = playerPos.x + Math.cos(angle) * SPAWN_DISTANCE;
    const z = playerPos.z + Math.sin(angle) * SPAWN_DISTANCE;
    const y = this.world.getSurfaceHeight(x, z) + 1;
    this.group.position.set(x, y, z);
    this.scene.add(this.group);
  }

  update(delta, playerPos, inventory) {
    if (!this.active) return;

    this.animPhase += delta * 2;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.damageFlash = Math.max(0, this.damageFlash - delta * 3);

    // Phase transitions
    if (this.health <= PHASE_2_HEALTH && this.phase === 1) {
      this.phase = 2;
      this.bodyMat.color.setHex(0xff2266);
      this.bodyMat.emissive.setHex(0xff2266);
      this.bodyMat.emissiveIntensity = 0.3;
      this.bossGlow.color.setHex(0xff2266);
      this.bossGlow.intensity = 4;
    }

    // Move toward player
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.group.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist > BOSS_RANGE) {
      toPlayer.normalize();
      const speed = this.phase === 2 ? BOSS_SPEED * 1.5 : BOSS_SPEED;
      this.group.position.x += toPlayer.x * speed * delta;
      this.group.position.z += toPlayer.z * speed * delta;
      const y = this.world.getSurfaceHeight(this.group.position.x, this.group.position.z) + 1;
      this.group.position.y = y;
    }

    // Face player
    const look = new THREE.Vector3(playerPos.x, this.group.position.y, playerPos.z);
    this.group.lookAt(look);

    // Idle animation
    this.body.scale.y = 1 + Math.sin(this.animPhase) * 0.05;
    this.body.scale.x = 1 + Math.cos(this.animPhase * 0.7) * 0.03;
    this.leftArm.rotation.z = 0.5 + Math.sin(this.animPhase * 1.5) * 0.3;
    this.rightArm.rotation.z = -0.5 - Math.sin(this.animPhase * 1.5) * 0.3;

    // Flash when hurt
    if (this.damageFlash > 0) {
      this.bodyMat.emissiveIntensity = 0.8;
    } else {
      this.bodyMat.emissiveIntensity = this.phase === 2 ? 0.3 : 0.1;
    }

    // Update boss bar
    if (this.bossBarEl) {
      this.bossBarEl.style.display = 'block';
      this.bossBarFill.style.width = `${(this.health / this.maxHealth) * 100}%`;
      this.bossBarFill.style.background = this.phase === 2
        ? 'linear-gradient(90deg, #ff2266, #ff4488)'
        : 'linear-gradient(90deg, #cc44ff, #dd66ff)';
      this.bossBarName.textContent = this.phase === 2
        ? 'TAFFY THE TERRIBLE (ENRAGED!)'
        : 'TAFFY THE TERRIBLE';
    }

    return dist < BOSS_RANGE && this.attackCooldown <= 0 ? this.doAttack() : 0;
  }

  doAttack() {
    this.attackCooldown = this.phase === 2 ? ATTACK_COOLDOWN * 0.6 : ATTACK_COOLDOWN;
    return this.phase === 2 ? BOSS_DAMAGE * 1.5 : BOSS_DAMAGE;
  }

  takeDamage(amount) {
    if (!this.active) return;
    this.health -= amount;
    this.damageFlash = 1;

    if (this.health <= 0) {
      this.defeat();
    }
  }

  defeat() {
    this.active = false;
    this.defeated = true;
    this.group.visible = false;
    this.scene.remove(this.group);
    if (this.bossBarEl) this.bossBarEl.style.display = 'none';
  }
}
