import * as THREE from 'three';

export class RemotePlayer {
  constructor(scene, id, name) {
    this.scene = scene;
    this.id = id;
    this.name = name;

    // Interpolation state
    this.targetPos = new THREE.Vector3(0, 0, 0);
    this.currentPos = new THREE.Vector3(0, 0, 0);
    this.targetYaw = 0;
    this.currentYaw = 0;
    this.health = 100;
    this.weapon = null;
    this.attacking = false;
    this.attackAnim = 0;

    // Build the character model
    this.group = new THREE.Group();
    this._buildModel();
    this._buildNameTag(name);
    scene.add(this.group);
  }

  _buildModel() {
    // Body — candy-pink box
    const bodyGeo = new THREE.BoxGeometry(0.6, 1.0, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff69b4, roughness: 0.5, metalness: 0.1
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.9;
    this.body.castShadow = true;

    // Head — slightly lighter sphere
    const headGeo = new THREE.SphereGeometry(0.28, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffb6d5, roughness: 0.4, metalness: 0.1
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.7;
    this.head.castShadow = true;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.75, 0.22);
    rightEye.position.set(0.1, 1.75, 0.22);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xff69b4, roughness: 0.5
    });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.5, 0.9, 0);
    this.rightArm.position.set(0.5, 0.9, 0);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.6, 0.22);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0xcc5599, roughness: 0.5
    });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.3, 0);
    rightLeg.position.set(0.15, 0.3, 0);

    this.group.add(this.body, this.head, leftEye, rightEye,
      this.leftArm, this.rightArm, leftLeg, rightLeg);
  }

  _buildNameTag(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(name.slice(0, 12), 128, 35);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    this.nameTag = new THREE.Sprite(mat);
    this.nameTag.scale.set(2, 0.5, 1);
    this.nameTag.position.y = 2.2;
    this.group.add(this.nameTag);
  }

  applyUpdate(msg) {
    this.targetPos.set(msg.x, msg.y, msg.z);
    this.targetYaw = msg.yaw;
    this.health = msg.hp;
    this.weapon = msg.w;
    this.attacking = msg.atk;

    // On first update, snap to position
    if (this.currentPos.lengthSq() === 0) {
      this.currentPos.copy(this.targetPos);
      this.currentYaw = this.targetYaw;
    }
  }

  update(delta) {
    // Interpolate position smoothly
    this.currentPos.lerp(this.targetPos, Math.min(delta * 10, 1));
    this.group.position.copy(this.currentPos);

    // Interpolate rotation
    let yawDiff = this.targetYaw - this.currentYaw;
    // Handle wrapping
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.currentYaw += yawDiff * Math.min(delta * 10, 1);
    this.group.rotation.y = this.currentYaw;

    // Attack animation
    if (this.attacking) {
      this.attackAnim = Math.min(this.attackAnim + delta * 8, 1);
    } else {
      this.attackAnim = Math.max(this.attackAnim - delta * 5, 0);
    }
    // Swing right arm forward when attacking
    this.rightArm.rotation.x = -this.attackAnim * 1.5;

    // Gentle idle sway on arms
    const time = performance.now() / 1000;
    this.leftArm.rotation.x = Math.sin(time * 2) * 0.1;
    if (!this.attacking) {
      this.rightArm.rotation.x = Math.sin(time * 2 + Math.PI) * 0.1;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    // Dispose geometries and materials
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
}
