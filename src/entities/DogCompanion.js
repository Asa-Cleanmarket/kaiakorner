import * as THREE from 'three';

const DOG_SPEED = 8;
const FOLLOW_DISTANCE = 3;
const ATTACK_RANGE = 6;
const ATTACK_DAMAGE = 10;
const ATTACK_COOLDOWN = 1.2;

export class DogCompanion {
  constructor(scene, player, world) {
    this.scene = scene;
    this.player = player;
    this.world = world;
    this.active = false;
    this.walkCycle = 0;
    this.attackCooldown = 0;
    this.targetMonster = null;
    this.barkTimer = 0;

    // Build dog model
    this.group = new THREE.Group();

    // Body — slightly bigger for visibility
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.5, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.45;
    this.body.castShadow = true;

    // Head
    const headGeo = new THREE.BoxGeometry(0.45, 0.4, 0.45);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 0.7, 0.5);
    this.head.castShadow = true;

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.22, 0.16, 0.22);
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.05, 0.28);
    this.head.add(snout);

    // Nose (pink!)
    const noseGeo = new THREE.SphereGeometry(0.07, 6, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.3 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 0.38);
    this.head.add(nose);

    // Eyes — bigger and shinier
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.2, metalness: 0.3 });
    const eyeWhiteGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEyeWhite.position.set(-0.11, 0.06, 0.2);
    rightEyeWhite.position.set(0.11, 0.06, 0.2);
    leftEye.position.set(-0.11, 0.06, 0.23);
    rightEye.position.set(0.11, 0.06, 0.23);
    this.head.add(leftEyeWhite, rightEyeWhite, leftEye, rightEye);

    // Ears (floppy)
    const earGeo = new THREE.BoxGeometry(0.14, 0.22, 0.1);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.7 });
    this.leftEar = new THREE.Mesh(earGeo, earMat);
    this.rightEar = new THREE.Mesh(earGeo, earMat);
    this.leftEar.position.set(-0.2, 0.12, 0);
    this.rightEar.position.set(0.2, 0.12, 0);
    this.leftEar.rotation.z = 0.3;
    this.rightEar.rotation.z = -0.3;
    this.head.add(this.leftEar, this.rightEar);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.13, 0.32, 0.13);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.legs = [];
    const legPositions = [[-0.18, 0.16, 0.28], [0.18, 0.16, 0.28], [-0.18, 0.16, -0.28], [0.18, 0.16, -0.28]];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, ly, lz);
      this.legs.push(leg);
      this.group.add(leg);
    }

    // Tail — fluffier
    const tailGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.35, 5);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.tail = new THREE.Mesh(tailGeo, tailMat);
    this.tail.position.set(0, 0.6, -0.5);
    this.tail.rotation.x = -0.5;

    // Pink collar with tag
    const collarGeo = new THREE.TorusGeometry(0.25, 0.04, 6, 12);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.3, metalness: 0.3 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.6, 0.4);
    collar.rotation.x = Math.PI / 2;

    // Name tag (floating sprite)
    this.nameTag = this.createNameTag('COTTON PUP');
    this.nameTag.position.set(0, 1.3, 0);

    // Heart particles for when pup is happy/attacking
    this.hearts = [];

    this.group.add(this.body, this.head, this.tail, collar, this.nameTag);
    this.group.visible = false;
  }

  createNameTag(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.roundRect(8, 8, 240, 48, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ff69b4';
    ctx.lineWidth = 2;
    ctx.roundRect(8, 8, 240, 48, 8);
    ctx.stroke();

    // Text
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb6d5';
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
  }

  spawn(position) {
    this.active = true;
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.position.x += 2;
    this.scene.add(this.group);
  }

  spawnHeartParticle() {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff69b4, transparent: true, opacity: 1 });
    const heart = new THREE.Mesh(geo, mat);
    heart.position.copy(this.group.position);
    heart.position.y += 1.2;
    heart.position.x += (Math.random() - 0.5) * 0.5;
    heart.position.z += (Math.random() - 0.5) * 0.5;
    heart.userData.life = 1.0;
    heart.userData.vy = 1.5 + Math.random();
    this.scene.add(heart);
    this.hearts.push(heart);
  }

  update(delta, monsterSpawner, bossTaffy) {
    if (!this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.barkTimer = Math.max(0, this.barkTimer - delta);

    const toPlayer = new THREE.Vector3().subVectors(this.player.position, this.group.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    // Find nearest enemy (monsters + boss)
    let nearestTarget = null;
    let nearestDist = ATTACK_RANGE;
    let targetIsBoss = false;

    if (monsterSpawner) {
      for (const monster of monsterSpawner.monsters) {
        const d = this.group.position.distanceTo(monster.group.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestTarget = monster;
          targetIsBoss = false;
        }
      }
    }

    // Also check boss
    if (bossTaffy && bossTaffy.active) {
      const d = this.group.position.distanceTo(bossTaffy.group.position);
      if (d < nearestDist + 3) { // Prioritize boss slightly
        nearestDist = d;
        nearestTarget = bossTaffy;
        targetIsBoss = true;
      }
    }

    let moveTarget;
    if (nearestTarget && nearestDist < ATTACK_RANGE) {
      moveTarget = targetIsBoss ? nearestTarget.group.position : nearestTarget.group.position;
      this.targetMonster = nearestTarget;

      // Attack if close enough
      const attackDist = targetIsBoss ? 4 : 2;
      if (nearestDist < attackDist && this.attackCooldown <= 0) {
        if (targetIsBoss) {
          nearestTarget.takeDamage(ATTACK_DAMAGE);
        } else {
          nearestTarget.health -= ATTACK_DAMAGE;
        }
        this.attackCooldown = ATTACK_COOLDOWN;

        // Lunge + glow animation
        this.body.material.emissive.setHex(0xff69b4);
        this.body.material.emissiveIntensity = 0.8;
        setTimeout(() => {
          if (this.body.material) {
            this.body.material.emissive.setHex(0x000000);
            this.body.material.emissiveIntensity = 0;
          }
        }, 200);

        this.spawnHeartParticle();
        this.spawnHeartParticle();
      }
    } else if (distToPlayer > FOLLOW_DISTANCE) {
      moveTarget = this.player.position;
      this.targetMonster = null;
    } else {
      this.targetMonster = null;
      if (Math.random() < 0.002) {
        this.spawnHeartParticle();
      }
    }

    // Move
    if (moveTarget) {
      const dir = new THREE.Vector3().subVectors(moveTarget, this.group.position);
      dir.y = 0;
      dir.normalize();

      const speed = nearestMonster ? DOG_SPEED * 1.2 : DOG_SPEED;
      this.group.position.x += dir.x * speed * delta;
      this.group.position.z += dir.z * speed * delta;

      // Ground follow
      const groundY = this.world.getSurfaceHeight(this.group.position.x, this.group.position.z) + 1;
      this.group.position.y = groundY;

      // Face movement direction
      const lookTarget = new THREE.Vector3(moveTarget.x, this.group.position.y, moveTarget.z);
      this.group.lookAt(lookTarget);

      // Walk animation — bouncy legs
      this.walkCycle += delta * speed * 2;
      for (let i = 0; i < 4; i++) {
        const offset = i < 2 ? 0 : Math.PI;
        this.legs[i].position.y = 0.16 + Math.sin(this.walkCycle + offset) * 0.1;
      }
      // Head bob
      this.head.position.y = 0.7 + Math.sin(this.walkCycle * 0.5) * 0.04;
    }

    // Tail wag (always happy! — faster when near player)
    const wagSpeed = distToPlayer < FOLLOW_DISTANCE ? 0.015 : 0.008;
    this.tail.rotation.z = Math.sin(Date.now() * wagSpeed) * 0.5;

    // Ear flop
    this.leftEar.rotation.z = 0.3 + Math.sin(this.walkCycle * 0.5) * 0.15;
    this.rightEar.rotation.z = -0.3 - Math.sin(this.walkCycle * 0.5) * 0.15;

    // Name tag always faces camera
    this.nameTag.lookAt(this.player.camera ? this.player.camera.position : this.player.position);

    // Update heart particles
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      const h = this.hearts[i];
      h.userData.life -= delta;
      h.position.y += h.userData.vy * delta;
      h.material.opacity = Math.max(0, h.userData.life);
      h.scale.setScalar(0.5 + (1 - h.userData.life) * 0.5);
      if (h.userData.life <= 0) {
        this.scene.remove(h);
        h.geometry.dispose();
        h.material.dispose();
        this.hearts.splice(i, 1);
      }
    }

    // Teleport if too far from player
    if (distToPlayer > 30) {
      this.group.position.copy(this.player.position);
      this.group.position.x += 2;
      const groundY = this.world.getSurfaceHeight(this.group.position.x, this.group.position.z) + 1;
      this.group.position.y = groundY;
    }
  }

  remove() {
    this.active = false;
    this.group.visible = false;
    this.scene.remove(this.group);
    // Clean up hearts
    for (const h of this.hearts) {
      this.scene.remove(h);
      h.geometry.dispose();
      h.material.dispose();
    }
    this.hearts = [];
  }
}
