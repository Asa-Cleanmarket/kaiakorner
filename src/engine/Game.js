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
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: false }); // pixelated look
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1); // keep it chunky/retro
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // retro shadow style
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);

    // Post-processing for retro look: render at lower resolution
    this.renderScale = 0.5; // render at half res for pixelated feel
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

    // Lighting
    this.setupLighting();

    // Fog for atmosphere
    this.scene.fog = new THREE.FogExp2(0xffb6d5, 0.008);

    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Ambient light (changes with day/night)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Sun/moon directional light
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.scene.add(this.sunLight);

    // Hemisphere light for sky/ground color blending
    this.hemiLight = new THREE.HemisphereLight(0xff69b4, 0x7b68ee, 0.3);
    this.scene.add(this.hemiLight);
  }

  updateRenderSize() {
    const w = Math.floor(window.innerWidth * this.renderScale);
    const h = Math.floor(window.innerHeight * this.renderScale);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = window.innerWidth + 'px';
    this.renderer.domElement.style.height = window.innerHeight + 'px';
    this.renderer.domElement.style.imageRendering = 'pixelated';
  }

  start() {
    if (this.started) return;
    this.started = true;

    // Lock pointer for FPS controls
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
    const elapsed = this.clock.getElapsedTime();

    // Update systems
    this.dayNight.update(delta);
    this.player.update(delta);
    this.world.update(this.player.position);
    this.blockPlacer.update(this.input);
    this.monsterSpawner.update(delta, this.dayNight);
    this.ui.update(this.dayNight, this.player);

    // Update lighting based on day/night
    this.updateLighting();

    // Update sun position
    const sunAngle = this.dayNight.getSunAngle();
    this.sunLight.position.set(
      Math.cos(sunAngle) * 100,
      Math.sin(sunAngle) * 100,
      50
    );

    this.renderer.render(this.scene, this.camera);
  }

  updateLighting() {
    const t = this.dayNight.getTimeOfDay(); // 0 = midnight, 0.5 = noon
    const isDay = this.dayNight.isDay;

    if (isDay) {
      // Daytime: bright, pink-tinted
      const dayProgress = this.dayNight.getDayProgress();
      this.ambientLight.intensity = 0.4 + 0.4 * Math.sin(dayProgress * Math.PI);
      this.ambientLight.color.setHex(0xffeeff);
      this.sunLight.intensity = 0.6 + 0.6 * Math.sin(dayProgress * Math.PI);
      this.sunLight.color.setHex(0xffeedd);
      this.scene.fog.color.setHex(0xffb6d5);
      this.scene.fog.density = 0.008;
      this.scene.background = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0xffb6d5), 0.3);
      this.hemiLight.intensity = 0.3;
    } else {
      // Nighttime: dark purple, neon glow
      const nightProgress = this.dayNight.getNightProgress();
      this.ambientLight.intensity = 0.08;
      this.ambientLight.color.setHex(0x4400aa);
      this.sunLight.intensity = 0.05;
      this.sunLight.color.setHex(0x6644aa);
      this.scene.fog.color.setHex(0x1a0a2e);
      this.scene.fog.density = 0.015;
      this.scene.background = new THREE.Color(0x1a0a2e);
      this.hemiLight.intensity = 0.05;
      this.hemiLight.color.setHex(0x4400ff);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.updateRenderSize();
  }
}
