import * as THREE from 'three';

const MONSTER_TYPES = [
  {
    name: 'Shrek Prep',
    bodyColor: 0x66bb6a,
    accentColor: 0xff69b4,
    size: { w: 1.0, h: 1.6, d: 0.8 },
    speed: 2.5,
    health: 40,
    damage: 12,
    spawnWeight: 3,
    loot: [{ type: 'pink_brick', min: 1, max: 3 }],
  },
  {
    name: 'Lorax Lurker',
    bodyColor: 0xffb74d,
    accentColor: 0xff9ed8,
    size: { w: 0.7, h: 1.0, d: 0.7 },
    speed: 5,
    health: 20,
    damage: 6,
    spawnWeight: 5,
    loot: [{ type: 'cotton_candy_wood', min: 1, max: 2 }],
  },
  {
    name: 'Grinch Creeper',
    bodyColor: 0x4caf50,
    accentColor: 0xcc66ff,
    size: { w: 0.6, h: 2.0, d: 0.6 },
    speed: 3.5,
    health: 30,
    damage: 10,
    spawnWeight: 2,
    loot: [{ type: 'crystal_sugar', min: 1, max: 2 }],
  },
  {
    name: 'Sour Patch Kid',
    bodyColor: 0xff5252,
    accentColor: 0xffff44,
    size: { w: 0.45, h: 0.6, d: 0.45 },
    speed: 6,
    health: 8,
    damage: 4,
    spawnWeight: 4,
    loot: [{ type: 'gummy_block', min: 1, max: 1 }],
  },
  {
    name: 'Warhead Wolf',
    bodyColor: 0x555577,
    accentColor: 0x00ff88,
    size: { w: 1.2, h: 1.0, d: 1.4 },
    speed: 7,
    health: 50,
    damage: 15,
    spawnWeight: 1,
    loot: [{ type: 'crystal_sugar', min: 2, max: 4 }, { type: 'gummy_block', min: 1, max: 2 }],
  },
  {
    name: 'Boba Phantom',
    bodyColor: 0x9966cc,
    accentColor: 0xffffff,
    size: { w: 0.8, h: 1.8, d: 0.8 },
    speed: 3,
    health: 25,
    damage: 8,
    spawnWeight: 2,
    loot: [{ type: 'marshmallow_pad', min: 1, max: 2 }],
  },
];

const MAX_MONSTERS = 12;
const SPAWN_RADIUS_MIN = 20;
const SPAWN_RADIUS_MAX = 35;
const SPAWN_INTERVAL = 2.5;

export class MonsterSpawner {
  constructor(scene, world, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.monsters = [];
    this.spawnTimer = 0;
    // Reusable vectors
    this._dir = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this._toMonster = new THREE.Vector3();
  }

  update(delta, dayNight) {
    if (dayNight.isDay) {
      if (this.monsters.length > 0) this.despawnAll();
      return;
    }

    this.spawnTimer += delta;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.monsters.length < MAX_MONSTERS) {
      this.spawnTimer = 0;
      this.spawnMonster();
    }

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      this.updateMonster(monster, delta);

      if (monster.health <= 0) {
        this.killMonster(monster, i);
      }
    }
  }

  spawnMonster() {
    const totalWeight = MONSTER_TYPES.reduce((sum, t) => sum + t.spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    let type = MONSTER_TYPES[0];
    for (const t of MONSTER_TYPES) {
      roll -= t.spawnWeight;
      if (roll <= 0) { type = t; break; }
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const x = this.player.position.x + Math.cos(angle) * dist;
    const z = this.player.position.z + Math.sin(angle) * dist;
    const y = this.world.getSurfaceHeight(x, z) + 1;

    // Body
    const bodyGeo = new THREE.BoxGeometry(type.size.w, type.size.h * 0.7, type.size.d);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: type.bodyColor,
      roughness: 0.6,
      metalness: 0,
      emissive: type.bodyColor,
      emissiveIntensity: 0.15,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);

    // Head
    const headSize = type.size.w * 0.8;
    const headGeo = new THREE.BoxGeometry(headSize, headSize, headSize * 0.9);
    const headMat = new THREE.MeshStandardMaterial({
      color: type.bodyColor,
      roughness: 0.5,
      emissive: type.bodyColor,
      emissiveIntensity: 0.15,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = type.size.h * 0.35 + headSize * 0.4;

    // Eyes — glowing
    const eyeGeo = new THREE.SphereGeometry(headSize * 0.15, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(headSize * 0.08, 6, 6);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);

    leftEye.position.set(-headSize * 0.25, headSize * 0.1, headSize * 0.4);
    rightEye.position.set(headSize * 0.25, headSize * 0.1, headSize * 0.4);
    leftPupil.position.set(-headSize * 0.25, headSize * 0.1, headSize * 0.48);
    rightPupil.position.set(headSize * 0.25, headSize * 0.1, headSize * 0.48);

    head.add(leftEye, rightEye, leftPupil, rightPupil);

    // Preppy accessory — bow or headband
    const accGeo = new THREE.BoxGeometry(headSize * 0.4, headSize * 0.15, headSize * 0.1);
    const accMat = new THREE.MeshStandardMaterial({ color: type.accentColor, roughness: 0.3 });
    const accessory = new THREE.Mesh(accGeo, accMat);
    accessory.position.set(0, headSize * 0.45, 0);
    head.add(accessory);

    // Group
    const group = new THREE.Group();
    group.add(body, head);
    group.position.set(x, y + type.size.h / 2, z);
    group.castShadow = true;
    this.scene.add(group);

    // Glow light
    const glowLight = new THREE.PointLight(type.bodyColor, 0.4, 6);
    glowLight.position.copy(group.position);
    this.scene.add(glowLight);

    this.monsters.push({
      group,
      body,
      head,
      glowLight,
      type,
      health: type.health,
      speed: type.speed,
      damage: type.damage,
      attackCooldown: 0,
      walkCycle: Math.random() * Math.PI * 2,
    });
  }

  updateMonster(monster, delta) {
    const dir = this._dir;
    dir.subVectors(this.player.position, monster.group.position);
    dir.y = 0;
    const distance = dir.length();
    dir.normalize();

    // Use player's cached shelter state instead of recalculating per monster
    const playerInShelter = this.player.inShelter;

    // Move toward player
    if (distance > 1.8 && !playerInShelter) {
      monster.group.position.x += dir.x * monster.speed * delta;
      monster.group.position.z += dir.z * monster.speed * delta;

      const groundY = this.world.getSurfaceHeight(monster.group.position.x, monster.group.position.z) + 1;
      monster.group.position.y = groundY + monster.type.size.h / 2;

      // Face player
      this._lookTarget.set(this.player.position.x, monster.group.position.y, this.player.position.z);
      monster.group.lookAt(this._lookTarget);
    }

    // Walk animation — bob up and down + sway
    monster.walkCycle += delta * monster.speed * 2;
    monster.body.position.y = Math.sin(monster.walkCycle) * 0.08;
    monster.head.rotation.z = Math.sin(monster.walkCycle * 0.7) * 0.05;

    // Update glow
    monster.glowLight.position.copy(monster.group.position);
    monster.glowLight.position.y += 0.5;

    // Attack
    monster.attackCooldown = Math.max(0, monster.attackCooldown - delta);
    if (distance < 2.2 && monster.attackCooldown <= 0 && !playerInShelter) {
      this.player.takeDamage(monster.damage);
      monster.attackCooldown = 1.2;

      // Lunge animation
      monster.body.material.emissiveIntensity = 0.6;
      setTimeout(() => {
        if (monster.body.material) monster.body.material.emissiveIntensity = 0.15;
      }, 150);
    }
  }

  killMonster(monster, index) {
    // Drop loot
    for (const loot of monster.type.loot) {
      const count = loot.min + Math.floor(Math.random() * (loot.max - loot.min + 1));
      this.player.inventory.add(loot.type, count);
    }

    this.scene.remove(monster.group);
    this.scene.remove(monster.glowLight);
    monster.glowLight.dispose();
    this.monsters.splice(index, 1);
    if (this.progression) this.progression.onMonsterKilled();
    if (this.sound) this.sound.playMonsterDeath();
  }

  // Called by player attack system
  attackMonstersInRange(origin, direction, range, damage) {
    let hitAny = false;
    for (const monster of this.monsters) {
      const toMonster = this._toMonster.subVectors(monster.group.position, origin);
      const dist = toMonster.length();
      if (dist > range) continue;

      toMonster.normalize();
      const dot = toMonster.dot(direction);
      if (dot > 0.4) {
        monster.health -= damage;
        hitAny = true;

        // Knockback
        monster.group.position.addScaledVector(toMonster, 1.5);

        // Flash white
        monster.body.material.color.setHex(0xffffff);
        monster.body.material.emissiveIntensity = 1;
        setTimeout(() => {
          if (monster.body.material) {
            monster.body.material.color.setHex(monster.type.bodyColor);
            monster.body.material.emissiveIntensity = 0.15;
          }
        }, 120);
      }
    }
    return hitAny;
  }

  despawnAll() {
    for (const monster of this.monsters) {
      this.scene.remove(monster.group);
      this.scene.remove(monster.glowLight);
      monster.glowLight.dispose();
    }
    this.monsters = [];
  }
}
