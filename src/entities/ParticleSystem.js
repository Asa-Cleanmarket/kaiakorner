import * as THREE from 'three';

const MAX_SPARKLES = 80;
const SPARKLE_RANGE = 30;

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.sparkles = [];
    this.spawnTimer = 0;

    // Shared geometries
    this.sparkleGeo = new THREE.SphereGeometry(0.08, 4, 4);

    // Hit effect pool
    this.hitEffects = [];
  }

  update(delta, playerPos, dayNight) {
    // Daytime sparkles
    if (dayNight.isDay) {
      this.spawnTimer += delta;
      if (this.spawnTimer > 0.1 && this.sparkles.length < MAX_SPARKLES) {
        this.spawnTimer = 0;
        this.spawnSparkle(playerPos);
      }
    }

    // Update sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.life -= delta;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        if (s.light) {
          this.scene.remove(s.light);
          s.light.dispose();
        }
        this.sparkles.splice(i, 1);
        continue;
      }

      // Float upward and fade
      s.mesh.position.y += s.speed * delta;
      s.mesh.position.x += Math.sin(s.wobble + s.life * 3) * 0.01;
      s.mesh.position.z += Math.cos(s.wobble + s.life * 2) * 0.01;

      const fade = Math.min(s.life * 2, 1);
      s.mesh.material.opacity = fade * 0.8;
      s.mesh.scale.setScalar(fade * s.baseScale);
      if (s.light) {
        s.light.position.copy(s.mesh.position);
        s.light.intensity = fade * 0.3;
      }
    }

    // Night fireflies (pop rock style)
    if (!dayNight.isDay) {
      this.spawnTimer += delta;
      if (this.spawnTimer > 0.15 && this.sparkles.length < MAX_SPARKLES) {
        this.spawnTimer = 0;
        this.spawnFirefly(playerPos);
      }
    }

    // Update hit effects
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const h = this.hitEffects[i];
      h.life -= delta;
      if (h.life <= 0) {
        for (const p of h.particles) this.scene.remove(p);
        this.hitEffects.splice(i, 1);
        continue;
      }
      for (let j = 0; j < h.particles.length; j++) {
        const p = h.particles[j];
        p.position.addScaledVector(h.velocities[j], delta);
        h.velocities[j].y -= 10 * delta; // gravity
        const fade = h.life / h.maxLife;
        p.material.opacity = fade;
        p.scale.setScalar(fade * 0.3);
      }
    }
  }

  spawnSparkle(playerPos) {
    const colors = [0xff69b4, 0xffb6d5, 0x87ceeb, 0xffffff, 0xffd700, 0xee82ee];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(this.sparkleGeo, mat);
    mesh.position.set(
      playerPos.x + (Math.random() - 0.5) * SPARKLE_RANGE * 2,
      playerPos.y + Math.random() * 8 + 2,
      playerPos.z + (Math.random() - 0.5) * SPARKLE_RANGE * 2
    );

    const baseScale = 0.5 + Math.random() * 1.0;
    mesh.scale.setScalar(baseScale);
    this.scene.add(mesh);

    this.sparkles.push({
      mesh,
      life: 2 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      baseScale,
    });
  }

  spawnFirefly(playerPos) {
    const colors = [0x44ffaa, 0xff44ff, 0x44aaff, 0xffff44, 0xff8844];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(this.sparkleGeo, mat);
    mesh.position.set(
      playerPos.x + (Math.random() - 0.5) * SPARKLE_RANGE,
      playerPos.y + Math.random() * 5 + 1,
      playerPos.z + (Math.random() - 0.5) * SPARKLE_RANGE
    );

    const baseScale = 0.3 + Math.random() * 0.5;
    mesh.scale.setScalar(baseScale);
    this.scene.add(mesh);

    // Add a tiny point light for glow
    const light = new THREE.PointLight(color, 0.3, 4);
    light.position.copy(mesh.position);
    this.scene.add(light);

    this.sparkles.push({
      mesh,
      light,
      life: 1.5 + Math.random() * 2.5,
      speed: 0.1 + Math.random() * 0.3,
      wobble: Math.random() * Math.PI * 2,
      baseScale,
    });
  }

  spawnHitEffect(position, color = 0xffffff) {
    const particles = [];
    const velocities = [];
    const count = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.sparkleGeo, mat);
      mesh.position.copy(position);
      mesh.scale.setScalar(0.3);
      this.scene.add(mesh);
      particles.push(mesh);

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 6
      ));
    }

    this.hitEffects.push({
      particles,
      velocities,
      life: 0.5,
      maxLife: 0.5,
    });
  }
}
