import * as THREE from 'three';

const DOG_SPEED = 8;
const FOLLOW_DISTANCE = 3;
const ATTACK_RANGE = 5;
const ATTACK_DAMAGE = 5;
const ATTACK_COOLDOWN = 1.5;

export class DogCompanion {
  constructor(scene, player, world) {
    this.scene = scene;
    this.player = player;
    this.world = world;
    this.active = false;
    this.walkCycle = 0;
    this.attackCooldown = 0;
    this.targetMonster = null;

    // Build dog model
    this.group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.4;
    this.body.castShadow = true;

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.set(0, 0.65, 0.45);
    this.head.castShadow = true;

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.05, 0.25);
    this.head.add(snout);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.3 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 0.35);
    this.head.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x332211 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 0.05, 0.18);
    rightEye.position.set(0.1, 0.05, 0.18);
    this.head.add(leftEye, rightEye);

    // Ears (floppy)
    const earGeo = new THREE.BoxGeometry(0.12, 0.2, 0.08);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.7 });
    this.leftEar = new THREE.Mesh(earGeo, earMat);
    this.rightEar = new THREE.Mesh(earGeo, earMat);
    this.leftEar.position.set(-0.18, 0.1, 0);
    this.rightEar.position.set(0.18, 0.1, 0);
    this.leftEar.rotation.z = 0.3;
    this.rightEar.rotation.z = -0.3;
    this.head.add(this.leftEar, this.rightEar);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.12, 0.3, 0.12);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.legs = [];
    const legPositions = [[-0.15, 0.15, 0.25], [0.15, 0.15, 0.25], [-0.15, 0.15, -0.25], [0.15, 0.15, -0.25]];
    for (const [lx, ly, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, ly, lz);
      this.legs.push(leg);
      this.group.add(leg);
    }

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.3, 4);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xfff0e0, roughness: 0.7 });
    this.tail = new THREE.Mesh(tailGeo, tailMat);
    this.tail.position.set(0, 0.55, -0.45);
    this.tail.rotation.x = -0.5;

    // Pink collar
    const collarGeo = new THREE.TorusGeometry(0.22, 0.03, 6, 12);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.3, metalness: 0.3 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.55, 0.35);
    collar.rotation.x = Math.PI / 2;

    this.group.add(this.body, this.head, this.tail, collar);
    this.group.visible = false;
  }

  spawn(position) {
    this.active = true;
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.position.x += 2;
    this.scene.add(this.group);
  }

  update(delta, monsterSpawner) {
    if (!this.active) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const toPlayer = new THREE.Vector3().subVectors(this.player.position, this.group.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    // Find nearest monster
    let nearestMonster = null;
    let nearestDist = ATTACK_RANGE;
    if (monsterSpawner) {
      for (const monster of monsterSpawner.monsters) {
        const d = this.group.position.distanceTo(monster.group.position);
        if (d < nearestDist) {
          nearestDist = d;
          nearestMonster = monster;
        }
      }
    }

    let moveTarget;
    if (nearestMonster && nearestDist < ATTACK_RANGE) {
      // Attack mode — move toward monster
      moveTarget = nearestMonster.group.position;
      this.targetMonster = nearestMonster;

      // Attack if close enough
      if (nearestDist < 2 && this.attackCooldown <= 0) {
        nearestMonster.health -= ATTACK_DAMAGE;
        this.attackCooldown = ATTACK_COOLDOWN;
        // Lunge animation
        this.body.material.emissive.setHex(0xff69b4);
        this.body.material.emissiveIntensity = 0.5;
        setTimeout(() => {
          if (this.body.material) {
            this.body.material.emissive.setHex(0x000000);
            this.body.material.emissiveIntensity = 0;
          }
        }, 150);
      }
    } else if (distToPlayer > FOLLOW_DISTANCE) {
      // Follow player
      moveTarget = this.player.position;
      this.targetMonster = null;
    } else {
      this.targetMonster = null;
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

      // Walk animation
      this.walkCycle += delta * speed * 2;
      for (let i = 0; i < 4; i++) {
        const offset = i < 2 ? 0 : Math.PI;
        this.legs[i].position.y = 0.15 + Math.sin(this.walkCycle + offset) * 0.08;
      }
    }

    // Tail wag (always happy!)
    this.tail.rotation.z = Math.sin(Date.now() * 0.01) * 0.4;

    // Ear flop
    this.leftEar.rotation.z = 0.3 + Math.sin(this.walkCycle * 0.5) * 0.1;
    this.rightEar.rotation.z = -0.3 - Math.sin(this.walkCycle * 0.5) * 0.1;

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
  }
}
