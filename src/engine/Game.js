import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { World } from '../world/World.js';
import { DayNightCycle } from './DayNightCycle.js';
import { InputManager } from './InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { BlockPlacer } from '../world/BlockPlacer.js';
import { Inventory } from '../entities/Inventory.js';
import { MonsterSpawner } from '../entities/MonsterSpawner.js';

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    // Retro pixel render scale
    this.renderScale = 0.5;
    this.updateRenderSize();

    this.clock = new THREE.Clock();
    this.started = false;

    // Core systems
    this.input = new InputManager();
    this.dayNight = new DayNightCycle();
    this.inventory = new Inventory();
    this.ui = new UIManager(this);
    this.world = new World(this.scene);
    this.player = new Player(this.camera, this.scene, this.input, this.world, this.inventory);
    this.blockPlacer = new BlockPlacer(this.scene, this.camera, this.world, this.inventory);
    this.monsterSpawner = new MonsterSpawner(this.scene, this.world, this.player);

    this.setupLighting();

    // Ground plane so you never see sky below terrain
    // Ground plane sits at terrain base level so you never see below terrain
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4de680 }); // match candy grass
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 9; // just below min terrain height (base=10)
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // Fog to blend terrain into sky at distance
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 140);

    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Strong ambient so block colors read true
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(this.ambientLight);

    // Sun
    this.sunLight = new THREE.DirectionalLight(0xfff5ee, 1.2);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Hemisphere for pink sky / purple ground bounce
    this.hemiLight = new THREE.HemisphereLight(0xffc0cb, 0xdda0dd, 0.4);
    this.scene.add(this.hemiLight);
  }

  start() {
    if (this.started) return;
    this.started = true;

    this.renderer.domElement.requestPointerLock();
    document.addEventListener('click', () => {
      if (this.started && !document.pointerLockElement) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    this.world.generate(this.player.position);
    this.ui.init();
    this.clock.start();
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.dayNight.update(delta);
    this.player.update(delta);
    this.world.update(this.player.position);
    this.blockPlacer.update(this.input);
    this.monsterSpawner.update(delta, this.dayNight);
    this.ui.update(this.dayNight, this.player);

    this.updateLighting();

    // Move sun
    const sunAngle = this.dayNight.getSunAngle();
    this.sunLight.position.set(
      this.player.position.x + Math.cos(sunAngle) * 80,
      Math.sin(sunAngle) * 80 + 10,
      this.player.position.z + 30
    );
    this.sunLight.target.position.copy(this.player.position);

    // Keep ground plane centered on player
    this.groundPlane.position.x = this.player.position.x;
    this.groundPlane.position.z = this.player.position.z;

    this.renderer.render(this.scene, this.camera);
  }

  updateLighting() {
    if (this.dayNight.isDay) {
      const p = this.dayNight.getDayProgress();
      const sunUp = Math.sin(p * Math.PI); // 0 at dawn/dusk, 1 at noon

      this.ambientLight.intensity = 0.5 + 0.3 * sunUp;
      this.ambientLight.color.setHex(0xfff5ee);
      this.sunLight.intensity = 0.8 + 0.6 * sunUp;
      this.sunLight.color.setHex(0xfff5ee);
      this.hemiLight.intensity = 0.3 + 0.2 * sunUp;

      // Sky color: light blue with pink tint
      this.scene.background.setHex(0x87ceeb);
      this.scene.fog.color.setHex(0x87ceeb);
      this.scene.fog.near = 30;
      this.scene.fog.far = 120;

      // Sunset warning — sky turns orange/pink
      if (this.dayNight.isSunsetWarning) {
        this.scene.background.set(0xff9966);
        this.scene.fog.color.set(0xff9966);
        this.sunLight.color.setHex(0xff8844);
      }
    } else {
      // Night: dark purple, moody
      const p = this.dayNight.getNightProgress();

      this.ambientLight.intensity = 0.08;
      this.ambientLight.color.setHex(0x332266);
      this.sunLight.intensity = 0.05;
      this.sunLight.color.setHex(0x6644aa);
      this.hemiLight.intensity = 0.05;
      this.hemiLight.color.setHex(0x4400ff);
      this.hemiLight.groundColor.setHex(0x220044);

      this.scene.background.setHex(0x0d0620);
      this.scene.fog.color.setHex(0x0d0620);
      this.scene.fog.near = 10;
      this.scene.fog.far = 60;
    }
  }

  updateRenderSize() {
    const w = Math.floor(window.innerWidth * this.renderScale);
    const h = Math.floor(window.innerHeight * this.renderScale);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = window.innerWidth + 'px';
    this.renderer.domElement.style.height = window.innerHeight + 'px';
    this.renderer.domElement.style.imageRendering = 'pixelated';
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.updateRenderSize();
  }
}
