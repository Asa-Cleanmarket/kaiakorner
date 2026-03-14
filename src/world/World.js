import * as THREE from 'three';
import { BLOCK_TYPES, getBlockColor } from './BlockTypes.js';

const CHUNK_SIZE = 16;
const IS_MOBILE = 'ontouchstart' in window && (navigator.maxTouchPoints > 0);
const RENDER_DISTANCE = IS_MOBILE ? 3 : 4;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkMeshes = new Map();
    this.chunkDecorations = new Map();
    this.blockData = new Map();
    this.trees = [];

    // Shared geometries and materials to reduce draw calls
    this.flowerColors = [0xff69b4, 0xff99cc, 0xcc66ff, 0x66ccff, 0xffcc66, 0xff6699];
    this.grassBladeGeo = new THREE.PlaneGeometry(0.15, 0.5);

    // Shared tree geometries (reuse across all trees)
    this._trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 1, 5); // scale per-tree
    this._canopyGeos = [
      new THREE.SphereGeometry(1.0, 6, 4),
      new THREE.SphereGeometry(1.3, 6, 4),
      new THREE.SphereGeometry(1.6, 6, 4),
    ];
    // Shared decoration geometries
    this._flowerGeo = new THREE.SphereGeometry(0.15, 4, 3);
    this._grassGeo = new THREE.ConeGeometry(0.08, 0.4, 3);
    this._sprinkleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 3);
    this._gumDropGeo = new THREE.SphereGeometry(0.2, 5, 3);
    this._crystalGeo = new THREE.ConeGeometry(0.1, 0.5, 4);
    this._rockGeo = new THREE.DodecahedronGeometry(0.12, 0);

    // Material cache (keyed by color hex)
    this._matCache = new Map();

    // Chunk generation queue for progressive loading
    this._chunkQueue = [];
    this._chunksPerFrame = 2;
  }

  _getMat(color, opts = {}) {
    const key = color + (opts.emissive ? 'e' : '') + (opts.roughness || '');
    if (this._matCache.has(key)) return this._matCache.get(key);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness || 0.6,
      metalness: opts.metalness || 0,
      ...(opts.emissive ? { emissive: color, emissiveIntensity: 0.05 } : {}),
    });
    this._matCache.set(key, mat);
    return mat;
  }

  getChunkKey(cx, cz) { return `${cx},${cz}`; }
  blockKey(x, y, z) { return `${x},${y},${z}`; }

  generate(playerPos) {
    // Generate only the nearest chunks immediately, queue the rest
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);
    // Immediate: 3x3 around player
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.getChunkKey(cx, cz);
        if (!this.chunks.has(key)) {
          this.generateChunk(cx, cz);
        }
      }
    }
  }

  update(playerPos, elapsed) {
    this.updateChunks(playerPos);
    // Process chunk queue progressively
    const toProcess = Math.min(this._chunkQueue.length, this._chunksPerFrame);
    for (let i = 0; i < toProcess; i++) {
      const { cx, cz } = this._chunkQueue.shift();
      const key = this.getChunkKey(cx, cz);
      if (!this.chunks.has(key)) {
        this.generateChunk(cx, cz);
      }
    }
    // Animate trees gently (only nearby ones)
    if (elapsed !== undefined) {
      const px = playerPos.x, pz = playerPos.z;
      for (const tree of this.trees) {
        if (tree.canopy) {
          const dx = tree.trunk.position.x - px;
          const dz = tree.trunk.position.z - pz;
          if (dx * dx + dz * dz > 2500) continue; // skip distant trees (50 block radius)
          for (const c of tree.canopy) {
            c.position.y = tree.canopyBaseY + Math.sin(elapsed * 0.8 + tree.phase) * 0.1;
          }
        }
      }
    }
  }

  updateChunks(playerPos) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        if (dx * dx + dz * dz > (RENDER_DISTANCE + 0.5) * (RENDER_DISTANCE + 0.5)) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.getChunkKey(cx, cz);
        if (!this.chunks.has(key) && !this._chunkQueue.find(q => q.cx === cx && q.cz === cz)) {
          this._chunkQueue.push({ cx, cz });
        }
      }
    }

    for (const [key] of this.chunks) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > RENDER_DISTANCE + 2 || Math.abs(cz - pcz) > RENDER_DISTANCE + 2) {
        this.removeChunk(key);
      }
    }
  }

  removeChunk(key) {
    const mesh = this.chunkMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.chunkMeshes.delete(key);
    }
    const decos = this.chunkDecorations.get(key);
    if (decos) {
      for (const d of decos) {
        this.scene.remove(d);
        if (d.geometry) d.geometry.dispose();
        if (d.material) d.material.dispose();
      }
      this.chunkDecorations.delete(key);
    }
    // Remove trees belonging to this chunk
    this.trees = this.trees.filter(t => {
      if (t.chunkKey === key) {
        this.scene.remove(t.trunk);
        if (t.canopy) t.canopy.forEach(c => this.scene.remove(c));
        return false;
      }
      return true;
    });
    this.chunks.delete(key);
  }

  hash(x, z) {
    let h = (x * 374761393 + z * 668265263 + 1274126177) & 0x7fffffff;
    h = ((h >> 13) ^ h) * 1274126177;
    return ((h >> 16) ^ h) & 0x7fffffff;
  }

  noise2D(x, z, scale) {
    const ix = Math.floor(x / scale);
    const iz = Math.floor(z / scale);
    const fx = (x / scale) - ix;
    const fz = (z / scale) - iz;
    const sfx = fx * fx * (3 - 2 * fx);
    const sfz = fz * fz * (3 - 2 * fz);
    const v00 = (this.hash(ix, iz) % 1000) / 1000;
    const v10 = (this.hash(ix + 1, iz) % 1000) / 1000;
    const v01 = (this.hash(ix, iz + 1) % 1000) / 1000;
    const v11 = (this.hash(ix + 1, iz + 1) % 1000) / 1000;
    const top = v00 + (v10 - v00) * sfx;
    const bot = v01 + (v11 - v01) * sfx;
    return top + (bot - top) * sfz;
  }

  getBiome(wx, wz) {
    const temp = this.noise2D(wx + 1000, wz + 1000, 250);
    const moisture = this.noise2D(wx + 5000, wz + 5000, 250);
    if (temp > 0.6 && moisture > 0.5) return 'bubblegum_swamp';
    if (temp > 0.55 && moisture < 0.4) return 'gumdrop_mountains';
    if (temp < 0.35 && moisture > 0.5) return 'frosting_mountains';
    if (temp < 0.4 && moisture < 0.35) return 'sprinkle_beach';
    return 'cotton_candy_forest';
  }

  getHeight(wx, wz) {
    const biome = this.getBiome(wx, wz);
    let h = 0;
    if (biome === 'gumdrop_mountains') {
      h += this.noise2D(wx, wz, 60) * 10;
      h += this.noise2D(wx, wz, 30) * 4;
      h += this.noise2D(wx, wz, 15) * 2;
      return Math.floor(h) + 14;
    }
    if (biome === 'frosting_mountains') {
      h += this.noise2D(wx, wz, 50) * 14;
      h += this.noise2D(wx, wz, 25) * 5;
      h += this.noise2D(wx, wz, 12) * 2;
      return Math.floor(h) + 16;
    }
    if (biome === 'bubblegum_swamp') {
      h += this.noise2D(wx, wz, 100) * 2;
      h += this.noise2D(wx, wz, 50) * 1;
      return Math.floor(h) + 9; // Very flat, near water level
    }
    if (biome === 'sprinkle_beach') {
      h += this.noise2D(wx, wz, 120) * 2;
      h += this.noise2D(wx, wz, 40) * 0.5;
      return Math.floor(h) + 9; // Low, flat sandy terrain
    }
    // Cotton Candy Forest (default)
    h += this.noise2D(wx, wz, 80) * 5;
    h += this.noise2D(wx, wz, 40) * 2.5;
    h += this.noise2D(wx, wz, 20) * 1;
    return Math.floor(h) + 10;
  }

  generateChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    this.chunks.set(key, true);

    const heightMap = [];
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      heightMap[lx] = [];
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = this.getHeight(wx, wz);
        const biome = this.getBiome(wx, wz);
        heightMap[lx][lz] = height;
        for (let y = 0; y <= height; y++) {
          let blockType;
          if (biome === 'gumdrop_mountains') {
            if (y === height) blockType = BLOCK_TYPES.FROSTING_PLASTER;
            else if (y > height - 3) blockType = BLOCK_TYPES.GUMMY_BLOCK;
            else blockType = BLOCK_TYPES.JELLYBEAN_BRICK;
          } else if (biome === 'frosting_mountains') {
            if (y === height && height > 22) blockType = BLOCK_TYPES.FROSTING_PLASTER;
            else if (y === height) blockType = BLOCK_TYPES.CRYSTAL_SUGAR;
            else if (y > height - 3) blockType = BLOCK_TYPES.PEPPERMINT_CRYSTAL;
            else blockType = BLOCK_TYPES.PINK_BRICK;
          } else if (biome === 'bubblegum_swamp') {
            if (y === height) blockType = BLOCK_TYPES.BUBBLEGUM_RUBBER;
            else if (y > height - 2) blockType = BLOCK_TYPES.CHOCOLATE_SLAB;
            else blockType = BLOCK_TYPES.GRAHAM_CRACKER;
          } else if (biome === 'sprinkle_beach') {
            if (y === height) blockType = BLOCK_TYPES.GRAHAM_CRACKER;
            else if (y > height - 3) blockType = BLOCK_TYPES.CARAMEL_BLOCK;
            else blockType = BLOCK_TYPES.PINK_BRICK;
          } else {
            if (y === height) blockType = BLOCK_TYPES.GRASS;
            else if (y > height - 3) blockType = BLOCK_TYPES.COTTON_CANDY_WOOD;
            else blockType = BLOCK_TYPES.PINK_BRICK;
          }
          this.blockData.set(this.blockKey(wx, y, wz), blockType);
        }
      }
    }

    // Build mesh
    const positions = [];
    const colors = [];
    const indices = [];
    const normals = [];
    let vertCount = 0;
    const treePositions = [];
    const flowerPositions = [];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = heightMap[lx][lz];
        const biome = this.getBiome(wx, wz);

        for (let y = 0; y <= height; y++) {
          const blockType = this.blockData.get(this.blockKey(wx, y, wz));
          if (!blockType) continue;

          let color = getBlockColor(blockType);
          // Slight color variation for natural look
          if (blockType === BLOCK_TYPES.GRASS || blockType === BLOCK_TYPES.FROSTING_PLASTER || blockType === BLOCK_TYPES.BUBBLEGUM_RUBBER || blockType === BLOCK_TYPES.GRAHAM_CRACKER || blockType === BLOCK_TYPES.CRYSTAL_SUGAR) {
            const variation = ((this.hash(wx * 3, wz * 7) % 30) - 15) / 255;
            color = color.clone();
            color.r += variation;
            color.g += variation * 0.5;
          }

          const faces = [];
          if (!this.hasBlock(wx, y + 1, wz)) faces.push('top');
          if (y > 0 && !this.hasBlock(wx, y - 1, wz)) faces.push('bottom');
          if (!this.hasBlock(wx + 1, y, wz)) faces.push('right');
          if (!this.hasBlock(wx - 1, y, wz)) faces.push('left');
          if (!this.hasBlock(wx, y, wz + 1)) faces.push('front');
          if (!this.hasBlock(wx, y, wz - 1)) faces.push('back');

          for (const face of faces) {
            const verts = FACE_VERTICES[face];
            // Slight ambient occlusion: darken side/bottom faces
            let faceColor = color;
            if (face === 'bottom') {
              faceColor = color.clone().multiplyScalar(0.6);
            } else if (face !== 'top') {
              faceColor = color.clone().multiplyScalar(0.8);
            }

            for (const v of verts) {
              positions.push(wx + v[0], y + v[1], wz + v[2]);
              colors.push(faceColor.r, faceColor.g, faceColor.b);
              normals.push(...FACE_NORMALS[face]);
            }
            indices.push(vertCount, vertCount + 1, vertCount + 2, vertCount, vertCount + 2, vertCount + 3);
            vertCount += 4;
          }
        }

        // Trees — different density per biome (reduced for performance)
        const treeDensity = { cotton_candy_forest: 60, gumdrop_mountains: 90, frosting_mountains: 120, bubblegum_swamp: 50, sprinkle_beach: 150 };
        const treeMod = treeDensity[biome] || 60;
        if (this.hash(wx * 7, wz * 13) % treeMod === 0 && height > 5) {
          treePositions.push({ x: wx, y: height + 1, z: wz, biome });
        }

        // Flowers/grass tufts (reduced density)
        if (this.hash(wx * 11, wz * 23) % 14 === 0 && height > 5) {
          flowerPositions.push({ x: wx, y: height + 1, z: wz, biome });
        }
      }
    }

    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setIndex(indices);

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.chunkMeshes.set(key, mesh);
    }

    // Add decorations
    const decos = [];
    for (const fp of flowerPositions) {
      const deco = this.addFlower(fp.x, fp.y, fp.z, fp.biome);
      if (deco) decos.push(deco);
    }
    if (decos.length > 0) this.chunkDecorations.set(key, decos);

    // Add trees
    for (const tp of treePositions) {
      this.addTree(tp.x, tp.y, tp.z, key, tp.biome);
    }
  }

  hasBlock(x, y, z) {
    const key = this.blockKey(x, y, z);
    if (this.blockData.has(key)) return true;
    const h = this.getHeight(x, z);
    return y >= 0 && y <= h;
  }

  addFlower(x, y, z, biome = 'cotton_candy_forest') {
    const type = this.hash(x * 17, z * 31) % 3;
    let mesh;

    if (biome === 'gumdrop_mountains') {
      if (type === 0) {
        const gumColors = [0xff4444, 0x44cc44, 0xffaa00, 0xff44ff, 0x4488ff];
        const color = gumColors[this.hash(x, z) % gumColors.length];
        mesh = new THREE.Mesh(this._gumDropGeo, this._getMat(color, { roughness: 0.3, emissive: true }));
        mesh.scale.y = 0.7;
        mesh.position.set(x + 0.5 + (this.hash(x * 3, z) % 40) / 100, y + 0.1, z + 0.5);
      } else if (type === 1) {
        const crystalColors = [0xd4f1ff, 0xaaffee, 0xffccdd];
        const color = crystalColors[this.hash(x * 7, z * 3) % crystalColors.length];
        mesh = new THREE.Mesh(this._crystalGeo, this._getMat(color, { roughness: 0.2, metalness: 0.4, emissive: true }));
        mesh.position.set(x + 0.5, y + 0.25, z + 0.5);
      } else {
        mesh = new THREE.Mesh(this._rockGeo, this._getMat(0x998877, { roughness: 0.9 }));
        mesh.position.set(x + 0.5, y + 0.08, z + 0.5);
      }
    } else if (type === 0) {
      const color = this.flowerColors[this.hash(x, z) % this.flowerColors.length];
      mesh = new THREE.Mesh(this._flowerGeo, this._getMat(color, { roughness: 0.5, emissive: true }));
      mesh.position.set(x + 0.3 + (this.hash(x * 3, z) % 40) / 100, y + 0.15, z + 0.3 + (this.hash(x, z * 3) % 40) / 100);
    } else if (type === 1) {
      mesh = new THREE.Mesh(this._grassGeo, this._getMat(0x3dd070, { roughness: 0.8 }));
      mesh.position.set(x + 0.5 + (this.hash(x * 5, z * 7) % 30 - 15) / 100, y + 0.2, z + 0.5);
    } else {
      const sprinkleColors = [0xff4488, 0x44bbff, 0xffcc00, 0xff8844, 0xaa44ff];
      const color = sprinkleColors[this.hash(x * 13, z * 19) % sprinkleColors.length];
      mesh = new THREE.Mesh(this._sprinkleGeo, this._getMat(color, { roughness: 0.3, metalness: 0.2 }));
      mesh.position.set(x + 0.5, y + 0.05, z + 0.5);
    }

    if (mesh) {
      this.scene.add(mesh);
      return mesh;
    }
    return null;
  }

  addTree(x, y, z, chunkKey, biome = 'cotton_candy_forest') {
    const variant = this.hash(x, z) % 4;
    let trunkHeight, trunkColor;

    if (biome === 'gumdrop_mountains') {
      trunkHeight = 2 + (this.hash(x * 3, z * 5) % 2);
      trunkColor = [0xd2a679, 0xc49060, 0xb07848, 0xcc8833][variant];
    } else if (biome === 'frosting_mountains') {
      trunkHeight = 3 + (this.hash(x * 3, z * 5) % 2);
      trunkColor = [0xaaddee, 0xbbccdd, 0xccddee, 0x99bbcc][variant];
    } else if (biome === 'bubblegum_swamp') {
      trunkHeight = 5 + (this.hash(x * 3, z * 5) % 3);
      trunkColor = [0x886655, 0x775544, 0x664433, 0x553322][variant];
    } else if (biome === 'sprinkle_beach') {
      trunkHeight = 5 + (this.hash(x * 3, z * 5) % 2);
      trunkColor = [0xddbb88, 0xccaa77, 0xbb9966, 0xcc9955][variant];
    } else {
      trunkHeight = 4 + (this.hash(x * 3, z * 5) % 3);
      trunkColor = [0xc87aaf, 0xd88fc2, 0xb07acc, 0xcc6699][variant];
    }

    // Trunk — shared geometry, scaled, shared material
    const trunk = new THREE.Mesh(this._trunkGeo, this._getMat(trunkColor, { roughness: 0.7 }));
    trunk.scale.y = trunkHeight;
    trunk.position.set(x + 0.5, y + trunkHeight / 2, z + 0.5);
    trunk.castShadow = true;
    trunk.userData.type = 'tree';
    trunk.userData.health = 3;
    trunk.userData.maxHealth = 3;
    trunk.userData.resourceType = BLOCK_TYPES.COTTON_CANDY_WOOD;
    this.scene.add(trunk);

    // Canopy — 2-3 spheres using shared geometries (much less than 5-7)
    let canopyColors;
    if (biome === 'gumdrop_mountains') {
      canopyColors = [0xff4444, 0x44cc44, 0xffaa00, 0xff44ff][variant];
    } else if (biome === 'frosting_mountains') {
      canopyColors = [0xddeeff, 0xccddff, 0xbbccee, 0xaabbdd][variant];
    } else if (biome === 'bubblegum_swamp') {
      canopyColors = [0xff66cc, 0xcc44ff, 0xff66cc, 0xaa33dd][variant];
    } else if (biome === 'sprinkle_beach') {
      canopyColors = [0x66dd66, 0x77dd55, 0x55cc44, 0x66cc55][variant];
    } else {
      canopyColors = [0xff69b4, 0x55ccff, 0xcc66ff, 0xff69b4][variant];
    }

    const canopyY = y + trunkHeight;
    const canopy = [];
    const canopyCount = 2 + (this.hash(x * 11, z * 17) % 2); // 2-3 spheres

    for (let i = 0; i < canopyCount; i++) {
      const geoIdx = (this.hash(x + i * 7, z + i * 13) % 3);
      const geo = this._canopyGeos[geoIdx];
      const sphere = new THREE.Mesh(geo, this._getMat(canopyColors, { emissive: true, roughness: 0.6 }));

      const ox = ((this.hash(x * 3 + i, z * 7) % 200) - 100) / 100 * 1.2;
      const oy = ((this.hash(x * 5 + i, z * 11) % 100) / 100) * 1.5;
      const oz = ((this.hash(x * 7 + i, z * 3) % 200) - 100) / 100 * 1.2;

      sphere.position.set(x + 0.5 + ox, canopyY + oy, z + 0.5 + oz);
      this.scene.add(sphere);
      canopy.push(sphere);
    }

    this.trees.push({
      trunk,
      canopy,
      canopyBaseY: canopyY,
      phase: (this.hash(x, z) % 100) / 100 * Math.PI * 2,
      chunkKey,
    });
  }

  getBlock(x, y, z) {
    return this.blockData.get(this.blockKey(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  setBlock(x, y, z, type) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    const key = this.blockKey(bx, by, bz);
    if (type === null) this.blockData.delete(key);
    else this.blockData.set(key, type);

    const cx = Math.floor(bx / CHUNK_SIZE);
    const cz = Math.floor(bz / CHUNK_SIZE);
    this.rebuildChunkMesh(cx, cz);

    const lx = ((bx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((bz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    if (lx === 0) this.rebuildChunkMesh(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this.rebuildChunkMesh(cx + 1, cz);
    if (lz === 0) this.rebuildChunkMesh(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.rebuildChunkMesh(cx, cz + 1);
  }

  rebuildChunkMesh(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    if (!this.chunks.has(key)) return;

    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      this.scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      oldMesh.material.dispose();
      this.chunkMeshes.delete(key);
    }

    const positions = [], colors = [], indices = [], normals = [];
    let vertCount = 0;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        for (let y = 0; y <= this.getHeight(wx, wz) + 10; y++) {
          const blockType = this.blockData.get(this.blockKey(wx, y, wz));
          if (!blockType) continue;
          let color = getBlockColor(blockType);
          if (blockType === BLOCK_TYPES.GRASS) {
            const v = ((this.hash(wx * 3, wz * 7) % 30) - 15) / 255;
            color = color.clone(); color.r += v; color.g += v * 0.5;
          }
          const faces = [];
          if (!this.hasBlock(wx, y + 1, wz)) faces.push('top');
          if (y > 0 && !this.hasBlock(wx, y - 1, wz)) faces.push('bottom');
          if (!this.hasBlock(wx + 1, y, wz)) faces.push('right');
          if (!this.hasBlock(wx - 1, y, wz)) faces.push('left');
          if (!this.hasBlock(wx, y, wz + 1)) faces.push('front');
          if (!this.hasBlock(wx, y, wz - 1)) faces.push('back');

          for (const face of faces) {
            const verts = FACE_VERTICES[face];
            let fc = color;
            if (face === 'bottom') fc = color.clone().multiplyScalar(0.6);
            else if (face !== 'top') fc = color.clone().multiplyScalar(0.8);
            for (const v of verts) {
              positions.push(wx + v[0], y + v[1], wz + v[2]);
              colors.push(fc.r, fc.g, fc.b);
              normals.push(...FACE_NORMALS[face]);
            }
            indices.push(vertCount, vertCount + 1, vertCount + 2, vertCount, vertCount + 2, vertCount + 3);
            vertCount += 4;
          }
        }
      }
    }

    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setIndex(indices);
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.chunkMeshes.set(key, mesh);
    }
  }

  isSolid(x, y, z) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    if (this.blockData.has(this.blockKey(bx, by, bz))) return true;
    // Fallback to procedural height for ungenerated chunks
    const h = this.getHeight(bx, bz);
    return by >= 0 && by <= h;
  }

  getSurfaceHeight(x, z) {
    return this.getHeight(Math.floor(x), Math.floor(z));
  }

  // Find tree near a position (for chopping)
  findTreeNear(pos, maxDist) {
    let closest = null;
    let closestDist = maxDist;
    for (const tree of this.trees) {
      const d = tree.trunk.position.distanceTo(pos);
      if (d < closestDist) {
        closestDist = d;
        closest = tree;
      }
    }
    return closest;
  }

  removeTree(tree) {
    this.scene.remove(tree.trunk);
    if (tree.canopy) tree.canopy.forEach(c => this.scene.remove(c));
    this.trees = this.trees.filter(t => t !== tree);
  }

  // Check if a position is inside a player-built shelter (roof + walls)
  isInsideShelter(x, y, z) {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);

    // Check for roof: any solid block above within 4 blocks
    let hasRoof = false;
    for (let dy = 1; dy <= 4; dy++) {
      if (this.isSolid(bx, by + dy, bz)) { hasRoof = true; break; }
    }
    if (!hasRoof) return false;

    // Check walls: need at least 3 of 4 cardinal directions blocked within 3 blocks
    let wallCount = 0;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dz] of dirs) {
      for (let d = 1; d <= 3; d++) {
        if (this.isSolid(bx + dx * d, by, bz + dz * d) || this.isSolid(bx + dx * d, by + 1, bz + dz * d)) {
          wallCount++;
          break;
        }
      }
    }
    return wallCount >= 3;
  }
}

const FACE_VERTICES = {
  top: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]],
  bottom: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
  front: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]],
  back: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]],
  right: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]],
  left: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]],
};

const FACE_NORMALS = {
  top: [0,1,0], bottom: [0,-1,0], front: [0,0,1],
  back: [0,0,-1], right: [1,0,0], left: [-1,0,0],
};
