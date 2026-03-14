import * as THREE from 'three';
import { BLOCK_TYPES, getBlockColor } from './BlockTypes.js';

const REACH_DISTANCE = 7;

export class BlockPlacer {
  constructor(scene, camera, world, inventory) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.inventory = inventory;

    // Preview block — solid colored with wireframe overlay
    this.previewGroup = new THREE.Group();

    const previewGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    this.previewSolid = new THREE.Mesh(previewGeo, new THREE.MeshBasicMaterial({
      color: 0xff69b4,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    }));
    this.previewWire = new THREE.Mesh(
      new THREE.BoxGeometry(1.03, 1.03, 1.03),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
      })
    );
    this.previewGroup.add(this.previewSolid, this.previewWire);
    this.previewGroup.visible = false;
    this.scene.add(this.previewGroup);

    // Break highlight
    this.breakHighlight = new THREE.Mesh(
      new THREE.BoxGeometry(1.01, 1.01, 1.01),
      new THREE.MeshBasicMaterial({
        color: 0xff4444,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      })
    );
    this.breakHighlight.visible = false;
    this.scene.add(this.breakHighlight);

    this.placeTimer = 0;
    this.breakTimer = 0;
    this.justPlaced = false;
    this.justBroke = false;
  }

  update(input) {
    const isWeapon = this.inventory.getSelectedWeaponStats() !== null;
    const target = this.findTargetBlock();

    // Reset single-click flags
    this.justPlaced = false;
    this.justBroke = false;

    if (target) {
      // Show placement preview when holding a block
      if (!isWeapon && this.inventory.getSelectedBlockType()) {
        this.previewGroup.visible = true;
        this.previewGroup.position.set(
          target.placePos.x + 0.5,
          target.placePos.y + 0.5,
          target.placePos.z + 0.5
        );
        // Color the preview to match selected block
        const blockType = this.inventory.getSelectedBlockType();
        const color = getBlockColor(blockType);
        this.previewSolid.material.color.copy(color);
      } else {
        this.previewGroup.visible = false;
      }

      // Show break highlight when hovering with a block selected
      if (!isWeapon) {
        this.breakHighlight.visible = true;
        this.breakHighlight.position.set(
          target.blockPos.x + 0.5,
          target.blockPos.y + 0.5,
          target.blockPos.z + 0.5
        );
      } else {
        this.breakHighlight.visible = false;
      }

      // Right click: place block
      if (input.mouseButtons.right && !isWeapon) {
        this.placeTimer += 0.016;
        if (this.placeTimer > 0.15) {
          this.placeBlock(target.placePos);
          this.placeTimer = 0;
          this.justPlaced = true;
        }
      } else {
        this.placeTimer = 0.1; // fast first click
      }

      // Left click: break block (only when NOT holding a weapon)
      if (input.mouseButtons.left && !isWeapon) {
        this.breakTimer += 0.016;
        if (this.breakTimer > 0.2) {
          this.breakBlock(target.blockPos);
          this.breakTimer = 0;
          this.justBroke = true;
        }
      } else {
        this.breakTimer = 0.15; // fast first click
      }
    } else {
      this.previewGroup.visible = false;
      this.breakHighlight.visible = false;
    }
  }

  findTargetBlock() {
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

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

    // Don't place inside the player
    const camPos = this.camera.position;
    const dx = Math.abs(camPos.x - (pos.x + 0.5));
    const dy = Math.abs(camPos.y - 0.8 - (pos.y + 0.5));
    const dz = Math.abs(camPos.z - (pos.z + 0.5));
    if (dx < 0.8 && dy < 1.2 && dz < 0.8) return;

    this.world.setBlock(pos.x, pos.y, pos.z, selectedType);
    this.inventory.remove(selectedType, 1);
    if (this.progression) this.progression.onBlockPlaced();
    if (this.sound) this.sound.playBlockPlace();
  }

  breakBlock(pos) {
    const blockType = this.world.getBlock(pos.x, pos.y, pos.z);
    if (!blockType) return;

    // Don't break bedrock level
    if (pos.y <= 0) return;

    this.world.setBlock(pos.x, pos.y, pos.z, null);
    this.inventory.add(blockType, 1);
    if (this.sound) this.sound.playBlockBreak();
  }
}
