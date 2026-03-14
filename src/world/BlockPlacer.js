import * as THREE from 'three';
import { BLOCK_TYPES, getBlockColor } from './BlockTypes.js';

const REACH_DISTANCE = 6;

export class BlockPlacer {
  constructor(scene, camera, world, inventory) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.inventory = inventory;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = REACH_DISTANCE;

    // Preview block
    const previewGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const previewMat = new THREE.MeshBasicMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    this.preview = new THREE.Mesh(previewGeo, previewMat);
    this.preview.visible = false;
    this.scene.add(this.preview);

    this.placeTimer = 0;
    this.breakTimer = 0;
  }

  update(input) {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Only show building UI when a block is selected (not a weapon)
    const isWeapon = this.inventory.getSelectedWeaponStats() !== null;

    // Find the block we're looking at
    const target = this.findTargetBlock();

    if (target) {
      // Show preview only when holding a block
      this.preview.visible = !isWeapon;
      if (!isWeapon) {
        this.preview.position.set(
          target.placePos.x + 0.5,
          target.placePos.y + 0.5,
          target.placePos.z + 0.5
        );
      }

      // Right click: place block (always works if you have blocks)
      if (input.mouseButtons.right) {
        this.placeTimer += 0.016;
        if (this.placeTimer > 0.2) {
          this.placeBlock(target.placePos);
          this.placeTimer = 0;
        }
      } else {
        this.placeTimer = 0.15; // allow first click to be fast
      }

      // Left click: break block (only when NOT holding a weapon)
      if (input.mouseButtons.left && !isWeapon) {
        this.breakTimer += 0.016;
        if (this.breakTimer > 0.3) {
          this.breakBlock(target.blockPos);
          this.breakTimer = 0;
        }
      } else {
        this.breakTimer = 0.25;
      }
    } else {
      this.preview.visible = false;
    }
  }

  findTargetBlock() {
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    // Step along the ray
    const step = 0.1;
    const pos = origin.clone();
    let lastEmpty = null;

    for (let d = 0; d < REACH_DISTANCE; d += step) {
      pos.copy(origin).addScaledVector(dir, d);
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);

      if (this.world.isSolid(bx, by, bz)) {
        return {
          blockPos: { x: bx, y: by, z: bz },
          placePos: lastEmpty || { x: bx, y: by + 1, z: bz },
        };
      }
      lastEmpty = { x: bx, y: by, z: bz };
    }

    return null;
  }

  placeBlock(pos) {
    const selectedType = this.inventory.getSelectedBlockType();
    if (!selectedType) return;

    const count = this.inventory.getCount(selectedType);
    if (count <= 0) return;

    this.world.setBlock(pos.x, pos.y, pos.z, selectedType);
    this.inventory.remove(selectedType, 1);
    if (this.progression) this.progression.onBlockPlaced();
  }

  breakBlock(pos) {
    const blockType = this.world.getBlock(pos.x, pos.y, pos.z);
    if (!blockType) return;

    // Don't break bedrock level
    if (pos.y <= 0) return;

    this.world.setBlock(pos.x, pos.y, pos.z, null);
    this.inventory.add(blockType, 1);
  }
}
