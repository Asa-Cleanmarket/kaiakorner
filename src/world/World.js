import * as THREE from 'three';
import { BLOCK_TYPES, getBlockColor } from './BlockTypes.js';

const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 4;

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkMeshes = new Map();
    this.chunkTreeMeshes = new Map(); // track tree meshes per chunk for cleanup
    this.blockData = new Map();
    this.trees = [];
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  blockKey(x, y, z) {
    return `${x},${y},${z}`;
  }

  generate(playerPos) {
    this.updateChunks(playerPos);
  }

  update(playerPos) {
    this.updateChunks(playerPos);
  }

  updateChunks(playerPos) {
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.getChunkKey(cx, cz);
        if (!this.chunks.has(key)) {
          this.generateChunk(cx, cz);
        }
      }
    }

    // Remove distant chunks
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
    // Remove tree meshes
    const treeMeshes = this.chunkTreeMeshes.get(key);
    if (treeMeshes) {
      for (const m of treeMeshes) {
        this.scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
      this.chunkTreeMeshes.delete(key);
    }
    this.chunks.delete(key);
  }

  // Deterministic hash
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

  getHeight(wx, wz) {
    // Smooth rolling hills — gentle, no sharp cliffs
    let h = 0;
    h += this.noise2D(wx, wz, 80) * 5;
    h += this.noise2D(wx, wz, 40) * 2.5;
    h += this.noise2D(wx, wz, 20) * 1;
    return Math.floor(h) + 10; // high base so terrain is always thick
  }

  generateChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    this.chunks.set(key, true);

    // First pass: store all block data for this chunk
    const heightMap = [];
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      heightMap[lx] = [];
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = this.getHeight(wx, wz);
        heightMap[lx][lz] = height;

        for (let y = 0; y <= height; y++) {
          let blockType;
          if (y === height) {
            blockType = BLOCK_TYPES.GRASS;
          } else if (y > height - 3) {
            blockType = BLOCK_TYPES.COTTON_CANDY_WOOD;
          } else {
            blockType = BLOCK_TYPES.PINK_BRICK;
          }
          this.blockData.set(this.blockKey(wx, y, wz), blockType);
        }
      }
    }

    // Second pass: build mesh with proper face culling
    const positions = [];
    const colors = [];
    const indices = [];
    const normals = [];
    let vertCount = 0;
    const treePositions = [];

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = heightMap[lx][lz];

        for (let y = 0; y <= height; y++) {
          const blockType = this.blockData.get(this.blockKey(wx, y, wz));
          if (!blockType) continue;

          const color = getBlockColor(blockType);

          // Check each face: only render if neighbor is air
          const faces = [];
          if (!this.hasBlock(wx, y + 1, wz)) faces.push('top');
          if (y > 0 && !this.hasBlock(wx, y - 1, wz)) faces.push('bottom');
          if (!this.hasBlock(wx + 1, y, wz)) faces.push('right');
          if (!this.hasBlock(wx - 1, y, wz)) faces.push('left');
          if (!this.hasBlock(wx, y, wz + 1)) faces.push('front');
          if (!this.hasBlock(wx, y, wz - 1)) faces.push('back');

          for (const face of faces) {
            const verts = FACE_VERTICES[face];
            for (const v of verts) {
              positions.push(wx + v[0], y + v[1], wz + v[2]);
              colors.push(color.r, color.g, color.b);
              normals.push(...FACE_NORMALS[face]);
            }
            indices.push(
              vertCount, vertCount + 1, vertCount + 2,
              vertCount, vertCount + 2, vertCount + 3
            );
            vertCount += 4;
          }
        }

        // Trees — less dense, only on surface
        if (this.hash(wx * 7, wz * 13) % 25 === 0 && height > 3) {
          treePositions.push({ x: wx, y: height + 1, z: wz });
        }
      }
    }

    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setIndex(indices);

      const material = new THREE.MeshLambertMaterial({ vertexColors: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.chunkMeshes.set(key, mesh);
    }

    // Add trees
    const treeMeshes = [];
    for (const tp of treePositions) {
      const meshes = this.addTree(tp.x, tp.y, tp.z);
      treeMeshes.push(...meshes);
    }
    if (treeMeshes.length > 0) {
      this.chunkTreeMeshes.set(key, treeMeshes);
    }
  }

  // Check if a block exists at position — uses height function as fallback for unloaded chunks
  hasBlock(x, y, z) {
    const key = this.blockKey(x, y, z);
    if (this.blockData.has(key)) return true;
    // For blocks in unloaded chunks, check height
    const h = this.getHeight(x, z);
    return y >= 0 && y <= h;
  }

  addTree(x, y, z) {
    const meshes = [];
    const trunkHeight = 3 + (this.hash(x * 3, z * 5) % 3);
    const variant = this.hash(x, z) % 3;

    // Brighter trunk colors
    const trunkColors = [0xff7eb9, 0xffadd6, 0xc88fe8];
    const trunkColor = trunkColors[variant];

    // Trunk
    const trunkGeo = new THREE.BoxGeometry(0.8, trunkHeight, 0.8);
    const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x + 0.5, y + trunkHeight / 2 - 0.5, z + 0.5);
    trunk.castShadow = true;
    trunk.userData.type = 'tree';
    trunk.userData.health = 3;
    trunk.userData.resourceType = BLOCK_TYPES.COTTON_CANDY_WOOD;
    this.scene.add(trunk);
    this.trees.push(trunk);
    meshes.push(trunk);

    // Canopy — bright cotton candy puffs
    const canopyColors = [0xff69b4, 0x69d4ff, 0xffb6d5, 0xb469ff, 0xff9ed8, 0x69f0ff];
    const canopyY = y + trunkHeight - 0.5;

    // Use seeded random for deterministic canopy
    const canopyCount = 4 + (this.hash(x * 11, z * 17) % 3);
    for (let i = 0; i < canopyCount; i++) {
      const radius = 1.0 + ((this.hash(x + i * 7, z + i * 13) % 100) / 100) * 0.8;
      const geo = new THREE.IcosahedronGeometry(radius, 1); // low poly sphere
      const color = canopyColors[this.hash(x + i * 7, z + i * 13) % canopyColors.length];
      const mat = new THREE.MeshLambertMaterial({ color });
      const sphere = new THREE.Mesh(geo, mat);

      // Deterministic offsets
      const ox = ((this.hash(x * 3 + i, z * 7) % 200) - 100) / 100 * 1.5;
      const oy = ((this.hash(x * 5 + i, z * 11) % 100) / 100) * 2;
      const oz = ((this.hash(x * 7 + i, z * 3) % 200) - 100) / 100 * 1.5;

      sphere.position.set(x + 0.5 + ox, canopyY + oy, z + 0.5 + oz);
      sphere.castShadow = true;
      sphere.userData.type = 'canopy';
      sphere.userData.parentTree = trunk;
      this.scene.add(sphere);
      meshes.push(sphere);
    }

    return meshes;
  }

  getBlock(x, y, z) {
    return this.blockData.get(this.blockKey(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  setBlock(x, y, z, type) {
    const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
    const key = this.blockKey(bx, by, bz);
    if (type === null) {
      this.blockData.delete(key);
    } else {
      this.blockData.set(key, type);
    }
    // Rebuild affected chunk and neighbors
    const cx = Math.floor(bx / CHUNK_SIZE);
    const cz = Math.floor(bz / CHUNK_SIZE);
    this.rebuildChunkMesh(cx, cz);

    // Rebuild neighbor chunks if block is at edge
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

    // Remove old mesh only (keep block data and trees)
    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      this.scene.remove(oldMesh);
      oldMesh.geometry.dispose();
      oldMesh.material.dispose();
      this.chunkMeshes.delete(key);
    }

    // Rebuild mesh from existing blockData
    const positions = [];
    const colors = [];
    const indices = [];
    const normals = [];
    let vertCount = 0;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;
        const height = this.getHeight(wx, wz);

        for (let y = 0; y <= height + 10; y++) {
          const blockType = this.blockData.get(this.blockKey(wx, y, wz));
          if (!blockType) continue;

          const color = getBlockColor(blockType);
          const faces = [];
          if (!this.blockData.has(this.blockKey(wx, y + 1, wz))) faces.push('top');
          if (y > 0 && !this.blockData.has(this.blockKey(wx, y - 1, wz))) faces.push('bottom');
          if (!this.hasBlock(wx + 1, y, wz)) faces.push('right');
          if (!this.hasBlock(wx - 1, y, wz)) faces.push('left');
          if (!this.hasBlock(wx, y, wz + 1)) faces.push('front');
          if (!this.hasBlock(wx, y, wz - 1)) faces.push('back');

          for (const face of faces) {
            const verts = FACE_VERTICES[face];
            for (const v of verts) {
              positions.push(wx + v[0], y + v[1], wz + v[2]);
              colors.push(color.r, color.g, color.b);
              normals.push(...FACE_NORMALS[face]);
            }
            indices.push(
              vertCount, vertCount + 1, vertCount + 2,
              vertCount, vertCount + 2, vertCount + 3
            );
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

      const material = new THREE.MeshLambertMaterial({ vertexColors: true });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.chunkMeshes.set(key, mesh);
    }
  }

  isSolid(x, y, z) {
    return this.blockData.has(this.blockKey(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  getSurfaceHeight(x, z) {
    return this.getHeight(Math.floor(x), Math.floor(z));
  }
}

const FACE_VERTICES = {
  top:    [[0,1,0], [1,1,0], [1,1,1], [0,1,1]],
  bottom: [[0,0,1], [1,0,1], [1,0,0], [0,0,0]],
  front:  [[0,0,1], [0,1,1], [1,1,1], [1,0,1]],
  back:   [[1,0,0], [1,1,0], [0,1,0], [0,0,0]],
  right:  [[1,0,1], [1,1,1], [1,1,0], [1,0,0]],
  left:   [[0,0,0], [0,1,0], [0,1,1], [0,0,1]],
};

const FACE_NORMALS = {
  top:    [0, 1, 0],
  bottom: [0, -1, 0],
  front:  [0, 0, 1],
  back:   [0, 0, -1],
  right:  [1, 0, 0],
  left:   [-1, 0, 0],
};
