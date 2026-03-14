import * as THREE from 'three';
import { BLOCK_TYPES, getBlockColor } from './BlockTypes.js';

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 32;
const RENDER_DISTANCE = 4; // chunks in each direction

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // key: "x,z" -> chunk data
    this.chunkMeshes = new Map(); // key: "x,z" -> THREE.Mesh
    this.blockData = new Map(); // global block storage: "x,y,z" -> blockType
    this.trees = []; // tree objects for interaction
  }

  getChunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getBlockKey(x, y, z) {
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

    // Generate chunks within render distance
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
    for (const [key, mesh] of this.chunkMeshes) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.abs(cx - pcx) > RENDER_DISTANCE + 1 || Math.abs(cz - pcz) > RENDER_DISTANCE + 1) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
          else mesh.material.dispose();
        }
        this.chunkMeshes.delete(key);
        this.chunks.delete(key);
      }
    }
  }

  // Simple seeded random for deterministic terrain
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
    // Multi-octave noise for terrain
    let h = 0;
    h += this.noise2D(wx, wz, 64) * 12;
    h += this.noise2D(wx, wz, 32) * 6;
    h += this.noise2D(wx, wz, 16) * 3;
    h += this.noise2D(wx, wz, 8) * 1.5;
    return Math.floor(h) + 2; // base height offset
  }

  generateChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    this.chunks.set(key, true);

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
        const height = this.getHeight(wx, wz);

        for (let y = 0; y <= height; y++) {
          const bk = this.getBlockKey(wx, y, wz);
          let blockType;

          if (y === height) {
            blockType = BLOCK_TYPES.GRASS;
          } else if (y > height - 3) {
            blockType = BLOCK_TYPES.COTTON_CANDY_WOOD;
          } else {
            blockType = BLOCK_TYPES.PINK_BRICK;
          }

          this.blockData.set(bk, blockType);

          // Only add visible faces
          const faces = this.getVisibleFaces(wx, y, wz, height);
          const color = getBlockColor(blockType);

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

        // Maybe spawn a tree
        if (this.hash(wx * 7, wz * 13) % 20 === 0 && height > 3) {
          treePositions.push({ x: wx, y: height + 1, z: wz });
        }
      }
    }

    if (positions.length === 0) return;

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

    // Add trees
    for (const tp of treePositions) {
      this.addTree(tp.x, tp.y, tp.z);
    }
  }

  getVisibleFaces(x, y, z, surfaceHeight) {
    const faces = [];
    // Top face: always visible if at surface
    if (y === surfaceHeight || !this.blockData.has(this.getBlockKey(x, y + 1, z))) {
      faces.push('top');
    }
    // Only add side faces for edge blocks
    if (!this.blockData.has(this.getBlockKey(x + 1, y, z)) && this.getHeight(x + 1, z) < y) faces.push('right');
    if (!this.blockData.has(this.getBlockKey(x - 1, y, z)) && this.getHeight(x - 1, z) < y) faces.push('left');
    if (!this.blockData.has(this.getBlockKey(x, y, z + 1)) && this.getHeight(x, z + 1) < y) faces.push('front');
    if (!this.blockData.has(this.getBlockKey(x, y, z - 1)) && this.getHeight(x, z - 1) < y) faces.push('back');
    if (y > 0 && !this.blockData.has(this.getBlockKey(x, y - 1, z))) faces.push('bottom');
    return faces;
  }

  addTree(x, y, z) {
    // Cotton candy tree: pink/blue fluffy trunk and canopy
    const trunkHeight = 3 + (this.hash(x * 3, z * 5) % 3);
    const trunkColor = (this.hash(x, z) % 2 === 0) ? 0xff69b4 : 0xffb6d5;

    // Trunk
    const trunkGeo = new THREE.BoxGeometry(1, trunkHeight, 1);
    const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x + 0.5, y + trunkHeight / 2, z + 0.5);
    trunk.castShadow = true;
    trunk.userData.type = 'tree';
    trunk.userData.health = 3;
    trunk.userData.resourceType = BLOCK_TYPES.COTTON_CANDY_WOOD;
    this.scene.add(trunk);
    this.trees.push(trunk);

    // Canopy (cotton candy fluff) - multiple spheres
    const canopyColors = [0xff69b4, 0x87ceeb, 0xffb6d5, 0x7b68ee, 0xdda0dd];
    const canopyY = y + trunkHeight;
    for (let i = 0; i < 5; i++) {
      const radius = 1.2 + Math.random() * 0.8;
      const geo = new THREE.SphereGeometry(radius, 6, 6); // low poly
      const color = canopyColors[this.hash(x + i * 7, z + i * 13) % canopyColors.length];
      const mat = new THREE.MeshLambertMaterial({ color });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(
        x + 0.5 + (Math.random() - 0.5) * 2,
        canopyY + Math.random() * 2,
        z + 0.5 + (Math.random() - 0.5) * 2
      );
      sphere.castShadow = true;
      sphere.userData.type = 'canopy';
      sphere.userData.parentTree = trunk;
      this.scene.add(sphere);
    }
  }

  getBlock(x, y, z) {
    return this.blockData.get(this.getBlockKey(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  setBlock(x, y, z, type) {
    const key = this.getBlockKey(Math.floor(x), Math.floor(y), Math.floor(z));
    if (type === null) {
      this.blockData.delete(key);
    } else {
      this.blockData.set(key, type);
    }
    // Rebuild affected chunk
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    this.rebuildChunk(cx, cz);
  }

  rebuildChunk(cx, cz) {
    const key = this.getChunkKey(cx, cz);
    const oldMesh = this.chunkMeshes.get(key);
    if (oldMesh) {
      this.scene.remove(oldMesh);
      if (oldMesh.geometry) oldMesh.geometry.dispose();
      if (oldMesh.material) oldMesh.material.dispose();
      this.chunkMeshes.delete(key);
    }
    this.chunks.delete(key);
    this.generateChunk(cx, cz);
  }

  // Check if a position is solid (for collision)
  isSolid(x, y, z) {
    return this.blockData.has(this.getBlockKey(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  getSurfaceHeight(x, z) {
    return this.getHeight(Math.floor(x), Math.floor(z));
  }
}

// Face vertex data for cube rendering
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
