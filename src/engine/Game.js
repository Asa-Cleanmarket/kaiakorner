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
import { NPCGumsworth } from '../entities/NPCGumsworth.js';
import { BossTaffy } from '../entities/BossTaffy.js';
import { CraftingSystem } from '../systems/CraftingSystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { SoundManager } from '../systems/SoundManager.js';
import { TouchControls } from './TouchControls.js';

export class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);

    const isMobileDevice = 'ontouchstart' in window && (navigator.maxTouchPoints > 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: !isMobileDevice, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2));
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
    this.gumsworth = new NPCGumsworth(this.scene, this.world);
    this.bossTaffy = new BossTaffy(this.scene, this.world);
    this.crafting = new CraftingSystem(this.inventory);
    this.progression = new ProgressionSystem();
    this.sound = new SoundManager();
    this.gumsTimer = 120;
    this.bossTimer = 600;
    this.lastNightState = false;

    // Wire cross-references
    this.player.monsterSpawner = this.monsterSpawner;
    this.player.particles = this.particles;
    this.player.bossTaffy = this.bossTaffy;
    this.player.progression = this.progression;
    this.player.sound = this.sound;
    this.blockPlacer.progression = this.progression;
    this.blockPlacer.sound = this.sound;
    this.monsterSpawner.progression = this.progression;
    this.monsterSpawner.sound = this.sound;
    this.crafting.progression = this.progression;
    this.crafting.sound = this.sound;

    // Detect mobile/tablet
    this.isMobile = 'ontouchstart' in window && (navigator.maxTouchPoints > 0);
    if (this.isMobile) {
      this.touchControls = new TouchControls(this.input);
    }

    // Reusable color objects for sunset lerping (avoid allocations every frame)
    this._sunsetColors = {
      skyFrom: new THREE.Color(0x87ceeb), skyTo: new THREE.Color(0xff7744),
      sunFrom: new THREE.Color(0xfff5ee), sunTo: new THREE.Color(0xff6633),
      topFrom: new THREE.Color(0x55aaee), topTo: new THREE.Color(0xff4422),
      botFrom: new THREE.Color(0xffeedd), botTo: new THREE.Color(0xff8844),
    };

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
    const shadowRes = this.isMobile ? 512 : 1024;
    this.sunLight.shadow.mapSize.width = shadowRes;
    this.sunLight.shadow.mapSize.height = shadowRes;
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
    // Ground plane — far below terrain so it never clips through
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3bb868,
      roughness: 0.9,
      metalness: 0,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -1;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // Sky dome — gradient from blue to white-ish at horizon
    const skyGeo = new THREE.SphereGeometry(350, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x55aaee) },
        bottomColor: { value: new THREE.Color(0xffeedd) },
        offset: { value: 20 },
        exponent: { value: 0.5 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Clouds
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 1, metalness: 0,
      transparent: true, opacity: 0.7,
    });
    const cloudCount = this.isMobile ? 8 : 15;
    for (let i = 0; i < cloudCount; i++) {
      const cloud = new THREE.Group();
      const puffCount = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < puffCount; j++) {
        const radius = 3 + Math.random() * 5;
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 7, 5),
          cloudMat
        );
        puff.position.set(
          (Math.random() - 0.5) * radius * 2,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * radius * 1.5
        );
        puff.scale.y = 0.4;
        cloud.add(puff);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 400,
        50 + Math.random() * 30,
        (Math.random() - 0.5) * 400
      );
      cloud.userData.speed = 0.5 + Math.random() * 1.5;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }

    // Water plane (low level, translucent)
    const waterGeo = new THREE.PlaneGeometry(2000, 2000);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x44bbff,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
    });
    this.waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this.waterPlane.rotation.x = -Math.PI / 2;
    this.waterPlane.position.y = 8;
    this.waterPlane.receiveShadow = true;
    this.scene.add(this.waterPlane);

    // Fog
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 250);
  }

  start() {
    if (this.started) return;
    this.started = true;

    this.sound.init();
    this.sound.resume();

    if (this.isMobile) {
      // Mobile: show touch controls, no pointer lock
      this.touchControls.show();
    } else {
      // Desktop: pointer lock for mouse look
      this.renderer.domElement.requestPointerLock();
      document.addEventListener('click', () => {
        if (this.started && !document.pointerLockElement) {
          this.renderer.domElement.requestPointerLock();
          this.sound.resume();
        }
      });
    }

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
    this.dog.update(delta, this.monsterSpawner, this.bossTaffy);
    this.particles.update(delta, this.player.position, this.dayNight);

    // Gumsworth NPC — spawns periodically
    if (this.gumsTimer > 0) {
      this.gumsTimer -= delta;
    } else if (!this.gumsworth.active) {
      this.gumsworth.spawn(this.player.position);
      this.gumsTimer = 180 + Math.random() * 120; // respawn 3-5 min
    }
    this.gumsworth.update(delta, this.player.position);

    // Boss Taffy — spawns after first night
    if (this.bossTimer > 0) {
      this.bossTimer -= delta;
    } else if (!this.bossTaffy.active && !this.bossTaffy.defeated && this.dayNight.cycleCount >= 1) {
      this.bossTaffy.spawn(this.player.position);
      this.sound.playBossSpawn();
    }
    const bossDmg = this.bossTaffy.update(delta, this.player.position, this.inventory);
    if (bossDmg > 0) this.player.takeDamage(bossDmg);

    // Crafting toggle
    if (this.input.justPressed('KeyC')) {
      this.crafting.toggle();
      // Release pointer lock so player can click on recipes (desktop)
      if (!this.isMobile && this.crafting.isOpen && document.pointerLockElement) {
        document.exitPointerLock();
      }
    }

    // NPC trading with T key — show trade panel
    if (this.input.justPressed('KeyT')) {
      if (this.gumsworth.interactable) {
        this.tradeOpen = !this.tradeOpen;
        if (!this.isMobile && this.tradeOpen && document.pointerLockElement) {
          document.exitPointerLock();
        }
      } else {
        this.tradeOpen = false;
      }
    }
    // Close trade panel if Gumsworth walks away
    if (this.tradeOpen && !this.gumsworth.interactable) {
      this.tradeOpen = false;
    }

    // Progression
    this.progression.update(delta);
    const currentBiome = this.world.getBiome(Math.floor(this.player.position.x), Math.floor(this.player.position.z));
    this.progression.onBiomeVisited(currentBiome);
    // Night survival tracking + day/night sounds
    if (this.lastNightState && this.dayNight.isDay) {
      this.progression.onNightSurvived();
      this.sound.playDawn();
    }
    if (!this.lastNightState && !this.dayNight.isDay) {
      this.sound.playNightfall();
    }
    this.lastNightState = !this.dayNight.isDay;

    // Level-up max health sync
    this.player.maxHealth = 100 + this.progression.getMaxHealthBonus();

    // Sound for level-up and badges (play once, not every frame)
    if (this.progression.levelUpTimer > 3.9 && !this._levelUpSoundPlayed) {
      this.sound.playLevelUp();
      this._levelUpSoundPlayed = true;
    }
    if (this.progression.levelUpTimer <= 3.9) this._levelUpSoundPlayed = false;
    if (this.progression.badgeTimer > 3.9 && !this._badgeSoundPlayed) {
      this.sound.playBadge();
      this._badgeSoundPlayed = true;
    }
    if (this.progression.badgeTimer <= 3.9) this._badgeSoundPlayed = false;

    this.ui.update(this.dayNight, this.player, this.cheatMessage, this.cheatMessageTimer, this.crafting, this.gumsworth, this.progression, this.tradeOpen);
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
    this.waterPlane.position.x = this.player.position.x;
    this.waterPlane.position.z = this.player.position.z;
    this.waterPlane.position.y = 8 + Math.sin(elapsed * 0.3) * 0.15;
    this.skyDome.position.copy(this.player.position);

    // Move clouds
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * delta;
      if (cloud.position.x > this.player.position.x + 220) {
        cloud.position.x = this.player.position.x - 220;
      }
      cloud.position.z += Math.sin(elapsed * 0.1 + cloud.position.x * 0.01) * delta * 0.3;
    }

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
      this.scene.fog.near = 80;
      this.scene.fog.far = 250;
      this.skyDome.material.uniforms.topColor.value.setHex(0x55aaee);
      this.skyDome.material.uniforms.bottomColor.value.setHex(0xffeedd);

      if (this.dayNight.isSunsetWarning) {
        const warn = (30 - this.dayNight.getTimeRemaining()) / 30;
        const t = Math.min(warn * 2, 1);
        const sc = this._sunsetColors;
        this.scene.background.lerpColors(sc.skyFrom, sc.skyTo, t);
        this.scene.fog.color.copy(this.scene.background);
        this.sunLight.color.lerpColors(sc.sunFrom, sc.sunTo, t);
        this.skyDome.material.uniforms.topColor.value.lerpColors(sc.topFrom, sc.topTo, t);
        this.skyDome.material.uniforms.bottomColor.value.lerpColors(sc.botFrom, sc.botTo, t);
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
      this.skyDome.material.uniforms.topColor.value.setHex(0x050015);
      this.skyDome.material.uniforms.bottomColor.value.setHex(0x110033);
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
