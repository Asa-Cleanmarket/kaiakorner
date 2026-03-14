import * as THREE from 'three';

const MONSTER_TYPES = [
  {
    name: 'Shrek Prep',
    color: 0x66bb6a,
    size: { w: 1.2, h: 1.8, d: 1.0 },
    speed: 2,
    health: 40,
    damage: 15,
    spawnWeight: 3,
  },
  {
    name: 'Lorax Lurker',
    color: 0xffb74d,
    size: { w: 0.8, h: 1.2, d: 0.8 },
    speed: 4.5,
    health: 20,
    damage: 8,
    spawnWeight: 5,
  },
  {
    name: 'Grinch Creeper',
    color: 0x4caf50,
    size: { w: 0.7, h: 2.2, d: 0.7 },
    speed: 3,
    health: 30,
    damage: 12,
    spawnWeight: 2,
  },
  {
    name: 'Sour Patch Kid',
    color: 0xff5252,
    size: { w: 0.5, h: 0.7, d: 0.5 },
    speed: 5,
    health: 10,
    damage: 5,
    spawnWeight: 8,
  },
];

const MAX_MONSTERS = 15;
const SPAWN_RADIUS_MIN = 15;
const SPAWN_RADIUS_MAX = 30;
const SPAWN_INTERVAL = 3; // seconds

export class MonsterSpawner {
  constructor(scene, world, player) {
    this.scene = scene;
    this.world = world;
    this.player = player;
    this.monsters = [];
    this.spawnTimer = 0;
  }

  update(delta, dayNight) {
    // Only spawn at night
    if (dayNight.isDay) {
      // Despawn monsters at dawn
      if (this.monsters.length > 0) {
        this.despawnAll();
      }
      return;
    }

    // Spawn timer
    this.spawnTimer += delta;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.monsters.length < MAX_MONSTERS) {
      this.spawnTimer = 0;
      this.spawnMonster();
    }

    // Update each monster
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      this.updateMonster(monster, delta);

      // Remove dead monsters
      if (monster.health <= 0) {
        this.scene.remove(monster.mesh);
        if (monster.glowLight) this.scene.remove(monster.glowLight);
        this.monsters.splice(i, 1);
        // Drop loot
        this.dropLoot(monster);
      }
    }
  }

  spawnMonster() {
    // Pick random type weighted by spawnWeight
    const totalWeight = MONSTER_TYPES.reduce((sum, t) => sum + t.spawnWeight, 0);
    let roll = Math.random() * totalWeight;
    let type = MONSTER_TYPES[0];
    for (const t of MONSTER_TYPES) {
      roll -= t.spawnWeight;
      if (roll <= 0) { type = t; break; }
    }

    // Random position around player
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    const x = this.player.position.x + Math.cos(angle) * dist;
    const z = this.player.position.z + Math.sin(angle) * dist;
    const y = this.world.getSurfaceHeight(x, z) + 1;

    // Create monster mesh (simple box for now — will be replaced with models)
    const geo = new THREE.BoxGeometry(type.size.w, type.size.h, type.size.d);
    const mat = new THREE.MeshLambertMaterial({ color: type.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + type.size.h / 2, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    // Eyes (two small white boxes)
    const eyeGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, type.size.h * 0.3, type.size.d / 2 + 0.01);
    rightEye.position.set(0.15, type.size.h * 0.3, type.size.d / 2 + 0.01);
    mesh.add(leftEye);
    mesh.add(rightEye);

    // Neon glow at night
    const glowLight = new THREE.PointLight(type.color, 0.5, 8);
    glowLight.position.copy(mesh.position);
    this.scene.add(glowLight);

    const monster = {
      mesh,
      glowLight,
      type,
      health: type.health,
      speed: type.speed,
      damage: type.damage,
      attackCooldown: 0,
      name: type.name,
    };

    this.monsters.push(monster);
  }

  updateMonster(monster, delta) {
    // Move toward player
    const dir = new THREE.Vector3();
    dir.subVectors(this.player.position, monster.mesh.position);
    dir.y = 0;
    const distance = dir.length();
    dir.normalize();

    // Don't enter houses (check if player is inside a structure)
    // Simple version: just chase the player
    if (distance > 1.5) {
      monster.mesh.position.x += dir.x * monster.speed * delta;
      monster.mesh.position.z += dir.z * monster.speed * delta;

      // Update ground height
      const groundY = this.world.getSurfaceHeight(monster.mesh.position.x, monster.mesh.position.z) + 1;
      monster.mesh.position.y = groundY + monster.type.size.h / 2;

      // Face player
      monster.mesh.lookAt(
        this.player.position.x,
        monster.mesh.position.y,
        this.player.position.z
      );
    }

    // Update glow light position
    if (monster.glowLight) {
      monster.glowLight.position.copy(monster.mesh.position);
    }

    // Attack player if close enough
    monster.attackCooldown = Math.max(0, monster.attackCooldown - delta);
    if (distance < 2 && monster.attackCooldown <= 0) {
      this.player.takeDamage(monster.damage);
      monster.attackCooldown = 1.5;

      // Knockback visual - flash red
      monster.mesh.material.emissive = new THREE.Color(0xff0000);
      setTimeout(() => {
        if (monster.mesh.material) {
          monster.mesh.material.emissive = new THREE.Color(0x000000);
        }
      }, 200);
    }

    // Bobbing animation
    monster.mesh.position.y += Math.sin(Date.now() * 0.003 + monster.mesh.id) * 0.01;
  }

  dropLoot(monster) {
    // Add loot to player inventory based on monster type
    this.player.inventory.add('cotton_candy_wood', 1 + Math.floor(Math.random() * 3));
  }

  despawnAll() {
    for (const monster of this.monsters) {
      this.scene.remove(monster.mesh);
      if (monster.glowLight) this.scene.remove(monster.glowLight);
    }
    this.monsters = [];
  }

  // Called when player attacks in a direction
  attackMonstersInRange(origin, direction, range, damage) {
    for (const monster of this.monsters) {
      const toMonster = new THREE.Vector3().subVectors(monster.mesh.position, origin);
      const dist = toMonster.length();
      if (dist > range) continue;

      toMonster.normalize();
      const dot = toMonster.dot(direction);
      if (dot > 0.5) { // within ~60 degree cone
        monster.health -= damage;

        // Knockback
        monster.mesh.position.addScaledVector(toMonster, 2);

        // Hit flash
        monster.mesh.material.emissive = new THREE.Color(0xffffff);
        setTimeout(() => {
          if (monster.mesh.material) {
            monster.mesh.material.emissive = new THREE.Color(0x000000);
          }
        }, 150);
      }
    }
  }
}
