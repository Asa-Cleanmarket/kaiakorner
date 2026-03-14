import * as THREE from 'three';

export class NPCGumsworth {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.active = false;
    this.interactable = false;
    this.bobPhase = Math.random() * Math.PI * 2;

    // Build gummy bear model
    this.group = new THREE.Group();

    // Body (round)
    const bodyGeo = new THREE.SphereGeometry(0.6, 8, 6);
    bodyGeo.scale(1, 1.2, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff8800, roughness: 0.4, metalness: 0.1,
      emissive: 0xff8800, emissiveIntensity: 0.05,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;

    // Head
    const headGeo = new THREE.SphereGeometry(0.45, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xffaa33, roughness: 0.4, metalness: 0.1,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    head.castShadow = true;

    // Ears (round)
    const earGeo = new THREE.SphereGeometry(0.15, 6, 5);
    const earMat = new THREE.MeshStandardMaterial({ color: 0xffaa33, roughness: 0.4 });
    const leftEar = new THREE.Mesh(earGeo, earMat);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-0.35, 2.0, 0);
    rightEar.position.set(0.35, 2.0, 0);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 1.8, 0.35);
    rightEye.position.set(0.15, 1.8, 0.35);

    // Smile
    const smileGeo = new THREE.TorusGeometry(0.12, 0.02, 4, 8, Math.PI);
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, 1.6, 0.38);
    smile.rotation.x = Math.PI;

    // Tiny hat (top hat)
    const hatBrimGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8);
    const hatTopGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.3, 8);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.6 });
    const brim = new THREE.Mesh(hatBrimGeo, hatMat);
    const top = new THREE.Mesh(hatTopGeo, hatMat);
    brim.position.set(0, 2.1, 0);
    top.position.set(0, 2.28, 0);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 5);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.4 });
    this.leftArm = new THREE.Mesh(armGeo, armMat);
    this.rightArm = new THREE.Mesh(armGeo, armMat);
    this.leftArm.position.set(-0.65, 0.9, 0);
    this.rightArm.position.set(0.65, 0.9, 0);
    this.leftArm.rotation.z = 0.3;
    this.rightArm.rotation.z = -0.3;

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.35, 5);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.4 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.15, 0);
    rightLeg.position.set(0.2, 0.15, 0);

    // Nametag (billboard sprite)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GUMSWORTH', 128, 30);
    ctx.fillStyle = '#ffaa00';
    ctx.font = '16px Courier New';
    ctx.fillText('[ TRADER ]', 128, 52);
    const nameTexture = new THREE.CanvasTexture(canvas);
    const nameMat = new THREE.SpriteMaterial({ map: nameTexture, transparent: true });
    this.nameTag = new THREE.Sprite(nameMat);
    this.nameTag.scale.set(2, 0.5, 1);
    this.nameTag.position.y = 2.8;

    // Glow light
    this.glow = new THREE.PointLight(0xffaa33, 0.8, 8);
    this.glow.position.y = 1;

    this.group.add(body, head, leftEar, rightEar, leftEye, rightEye, smile,
      brim, top, this.leftArm, this.rightArm, leftLeg, rightLeg,
      this.nameTag, this.glow);

    this.group.visible = false;
  }

  spawn(playerPos) {
    if (this.active) return;
    this.active = true;
    this.group.visible = true;

    // Spawn nearby but not on top of player
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 10;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const y = this.world.getSurfaceHeight(x, z) + 1;

    this.group.position.set(x, y, z);
    this.scene.add(this.group);
  }

  despawn() {
    this.active = false;
    this.group.visible = false;
    this.scene.remove(this.group);
  }

  update(delta, playerPos) {
    if (!this.active) return;

    const dist = this.group.position.distanceTo(playerPos);
    this.interactable = dist < 4;

    // Gentle idle bob
    this.bobPhase += delta * 2;
    this.group.position.y += Math.sin(this.bobPhase) * 0.002;

    // Wave arms when player is near
    if (this.interactable) {
      this.rightArm.rotation.z = -0.3 + Math.sin(this.bobPhase * 3) * 0.5;
    } else {
      this.rightArm.rotation.z = -0.3;
    }

    // Face player
    const look = new THREE.Vector3(playerPos.x, this.group.position.y, playerPos.z);
    this.group.lookAt(look);

    // Despawn if player goes too far
    if (dist > 60) {
      this.despawn();
    }
  }

  getTrades() {
    return [
      { give: { type: 'gummy_block', count: 5 }, get: { type: 'crystal_sugar', count: 3 } },
      { give: { type: 'cotton_candy_wood', count: 10 }, get: { type: 'gummy_block', count: 5 } },
      { give: { type: 'crystal_sugar', count: 5 }, get: { type: 'rainbow_block', count: 2 } },
      { give: { type: 'pink_brick', count: 10 }, get: { type: 'marshmallow_pad', count: 8 } },
      { give: { type: 'graham_cracker', count: 8 }, get: { type: 'caramel_block', count: 4 } },
      { give: { type: 'chocolate_slab', count: 5 }, get: { type: 'peppermint_crystal', count: 3 } },
      { give: { type: 'rainbow_block', count: 3 }, get: { type: 'candy_cane_beam', count: 8 } },
      { give: { type: 'marshmallow_pad', count: 10 }, get: { type: 'glass_candy', count: 6 } },
    ];
  }

  executeTrade(trade, inventory) {
    if (inventory.getCount(trade.give.type) < trade.give.count) return false;
    inventory.remove(trade.give.type, trade.give.count);
    inventory.add(trade.get.type, trade.get.count);
    return true;
  }
}
