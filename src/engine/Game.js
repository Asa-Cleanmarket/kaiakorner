import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { World } from '../world/World.js';
import { DayNightCycle } from './DayNightCycle.js';
import { InputManager } from './InputManager.js';
import { UIManager } from '../ui/UIManager.js';
import { BlockPlacer } from '../world/BlockPlacer.js';
import { Inventory } from '../entities/Inventory.js';
import { MonsterSpawner } from '../entities/MonsterSpawner.js';
import { ParticleSystem } from '../entities/ParticleSystem.js';
import { DogCompanion } from '../entities/DogCompanion.js';

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    document.body.appendChild(this.renderer.domElement);

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
    this.particles = new ParticleSystem(this.scene);

    this.dog = new DogCompanion(this.scene, this.player, this.world);

    // Wire cross-references
    this.player.monsterSpawner = this.monsterSpawner;
    this.player.particles = this.particles;

    this.setupLighting();
    this.setupEnvironment();
    this.setupCheatCodes();

    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xfff0f5, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5ee, 1.5);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.001;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0xffc0cb, 0xb088cc, 0.5);
    this.scene.add(this.hemiLight);

    // Subtle fill light from below for candy glow feel
    this.fillLight = new THREE.DirectionalLight(0xffb6d5, 0.15);
    this.fillLight.position.set(-30, -10, -20);
    this.scene.add(this.fillLight);
  }

  setupEnvironment() {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5ae088,
      roughness: 0.9,
      metalness: 0,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 9;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // Fog
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 200);
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
    this.dog.spawn(this.player.position);
    this.clock.start();
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.dayNight.update(delta);
    this.player.update(delta);
    this.world.update(this.player.position, elapsed);
    this.blockPlacer.update(this.input);
    this.monsterSpawner.update(delta, this.dayNight);
    this.dog.update(delta, this.monsterSpawner);
    this.particles.update(delta, this.player.position, this.dayNight);
    this.ui.update(this.dayNight, this.player, this.cheatMessage, this.cheatMessageTimer);
    if (this.cheatMessageTimer > 0) this.cheatMessageTimer -= delta;

    this.updateLighting(elapsed);

    // Sun tracks player
    const sunAngle = this.dayNight.getSunAngle();
    this.sunLight.position.set(
      this.player.position.x + Math.cos(sunAngle) * 100,
      Math.sin(sunAngle) * 100 + 20,
      this.player.position.z + 40
    );
    this.sunLight.target.position.copy(this.player.position);

    this.groundPlane.position.x = this.player.position.x;
    this.groundPlane.position.z = this.player.position.z;

    this.renderer.render(this.scene, this.camera);
  }

  updateLighting(elapsed) {
    if (this.dayNight.isDay) {
      const p = this.dayNight.getDayProgress();
      const sunUp = Math.sin(p * Math.PI);

      this.ambientLight.intensity = 0.4 + 0.35 * sunUp;
      this.ambientLight.color.setHex(0xfff5f0);
      this.sunLight.intensity = 1.0 + 0.8 * sunUp;
      this.sunLight.color.setHex(0xfff5ee);
      this.hemiLight.intensity = 0.3 + 0.3 * sunUp;
      this.hemiLight.color.setHex(0xffc0cb);
      this.fillLight.intensity = 0.1 + 0.1 * sunUp;

      this.renderer.toneMappingExposure = 1.0 + 0.2 * sunUp;

      this.scene.background.setHex(0x87ceeb);
      this.scene.fog.color.setHex(0x87ceeb);
      this.scene.fog.near = 60;
      this.scene.fog.far = 200;

      if (this.dayNight.isSunsetWarning) {
        const warn = (30 - this.dayNight.getTimeRemaining()) / 30;
        this.scene.background.lerpColors(
          new THREE.Color(0x87ceeb),
          new THREE.Color(0xff7744),
          Math.min(warn * 2, 1)
        );
        this.scene.fog.color.copy(this.scene.background);
        this.sunLight.color.lerpColors(
          new THREE.Color(0xfff5ee),
          new THREE.Color(0xff6633),
          Math.min(warn * 2, 1)
        );
      }
    } else {
      this.ambientLight.intensity = 0.06;
      this.ambientLight.color.setHex(0x221144);
      this.sunLight.intensity = 0.03;
      this.sunLight.color.setHex(0x6644aa);
      this.hemiLight.intensity = 0.04;
      this.hemiLight.color.setHex(0x3311aa);
      this.hemiLight.groundColor.setHex(0x110022);
      this.fillLight.intensity = 0.02;

      this.renderer.toneMappingExposure = 0.8;

      this.scene.background.setHex(0x08031a);
      this.scene.fog.color.setHex(0x08031a);
      this.scene.fog.near = 8;
      this.scene.fog.far = 50;
    }
  }

  setupCheatCodes() {
    this.cheatBuffer = '';
    this.cheatMessage = '';
    this.cheatMessageTimer = 0;

    const cheats = {
      'sugarmama': () => { this.player.health = this.player.maxHealth; return 'FULL HEALTH!'; },
      'rarecandy': () => { this.inventory.add('crystal_sugar', 50); return 'RARE CANDY x50!'; },
      'goldenboy': () => { this.inventory.add('cotton_candy_wood', 99); this.inventory.add('pink_brick', 99); return 'RESOURCES MAXED!'; },
      'puppylove': () => { if (!this.dog.active) this.dog.spawn(this.player.position); return 'GOOD BOY ACTIVATED!'; },
      'sweetdreams': () => { this.dayNight.elapsed = 0; return 'SWEET DREAMS — DAY RESET!'; },
      'bossmode': () => { this.player.maxHealth = 200; this.player.health = 200; return 'BOSS MODE — 200 HP!'; },
      'kaiaisqueen': () => {
        this.player.maxHealth = 999; this.player.health = 999;
        this.inventory.add('crystal_sugar', 99);
        this.inventory.add('gummy_block', 99);
        this.inventory.add('marshmallow_pad', 99);
        return 'KAIA IS QUEEN! ALL THE THINGS!';
      },
      'cottoncandy': () => { this.player.sugarRush = 30; return 'SUGAR RUSH x30!'; },
    };

    window.addEventListener('keypress', (e) => {
      if (!this.started) return;
      this.cheatBuffer += e.key.toLowerCase();
      if (this.cheatBuffer.length > 20) this.cheatBuffer = this.cheatBuffer.slice(-20);

      for (const [code, fn] of Object.entries(cheats)) {
        if (this.cheatBuffer.endsWith(code)) {
          this.cheatMessage = fn();
          this.cheatMessageTimer = 3;
          this.cheatBuffer = '';
          break;
        }
      }
    });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
