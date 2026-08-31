import * as THREE from 'three';
import { World } from './World.js';
import { TerrainGen } from './TerrainGen.js';
import { TextureAtlas } from './TextureAtlas.js';
import { MeshBuilder } from './MeshBuilder.js';
import { Player } from './Player.js';
import { Physics } from './Physics.js';
import { raycast, RaycastResult } from './Raycast.js';
import { Inventory } from './Inventory.js';
import { DayNight } from './DayNight.js';
import { Fluids } from './Fluids.js';
import { MobManager, PigMob } from './Mobs.js';
import { ParticleSystem } from './Particles.js';
import { SoundManager } from '../audio/SoundManager.js';
import { SaveSystem } from './SaveSystem.js';
import { HUD } from '../ui/HUD.js';
import { StartScreen } from '../ui/StartScreen.js';
import { HelpOverlay } from '../ui/HelpOverlay.js';
import { BlockType, isBreakable } from './BlockTypes.js';
import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z, WATER_LEVEL } from '../config.js';
import { RedstoneSystem } from '../redstone/RedstoneSystem.js';
import { getComponentType, isRedstoneComponent } from '../redstone/RedstoneTypes.js';
import { findBestLandSpawnNear, findSurfaceY as findSurfaceYUtil } from './SpawnFinder.js';

const FIXED_DT = 1 / 20; // 20 TPS
const MAX_ACCUMULATOR = 0.2;

/**
 * Main game class. Wires all systems together.
 */
export class Game {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public world: World;
  public player: Player;
  public physics: Physics;
  public inventory: Inventory;
  public dayNight: DayNight;
  public meshBuilder: MeshBuilder;
  public textureAtlas: TextureAtlas;
  public hud: HUD;
  public startScreen: StartScreen;
  public helpOverlay: HelpOverlay;
  public fluids: Fluids;
  public mobManager: MobManager;
  public particles: ParticleSystem;
  public soundManager: SoundManager;
  public saveSystem: SaveSystem;
  public redstoneSystem: RedstoneSystem;
  /** World position of the redstone demo center (for verification camera aiming). */
  public demoCenter: [number, number, number] | null = null;

  public blockHighlight: THREE.LineSegments;

  private clock: THREE.Clock;
  private accumulator: number = 0;
  private running: boolean = false;
  private started: boolean = false;
  private helpVisible: boolean = false;

  private blockChangeSet: Set<string> = new Set();
  private needsFullRebuild: boolean = false;
  private tickCount: number = 0;

  constructor(container: HTMLElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Camera
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);

    // Systems
    this.world = new World();
    this.textureAtlas = new TextureAtlas();
    this.meshBuilder = new MeshBuilder(this.world, this.textureAtlas);
    this.inventory = new Inventory();
    this.dayNight = new DayNight();
    this.physics = new Physics(this.world);
    this.player = new Player(camera, container);
    this.clock = new THREE.Clock();

    // UI
    this.hud = new HUD(container, this.inventory);
    this.startScreen = new StartScreen(container);
    this.helpOverlay = new HelpOverlay(container);

    // Phase B systems
    this.fluids = new Fluids(this.world);
    this.fluids.onBlockChanged = (wx, wy, wz) => this.scheduleRemesh(wx, wy, wz);
    this.mobManager = new MobManager(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.soundManager = new SoundManager();
    this.saveSystem = new SaveSystem();

    // Redstone system
    this.redstoneSystem = new RedstoneSystem(
      this.world,
      (cx, cz) => this.scheduleRemeshChunk(cx, cz),
      (name) => this.soundManager.play(name as any),
    );

    // Wire redstone system to mesh builder for real-state rendering
    this.meshBuilder.setRedstoneSystem(this.redstoneSystem);

    // Block highlight (LineSegments box)
    const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.blockHighlight = new THREE.LineSegments(highlightGeo, highlightMat);
    this.blockHighlight.visible = false;
    this.scene.add(this.blockHighlight);

    // Lighting
    this.setupLighting();

    // Generate world
    this.generateWorld();

    // Window resize
    window.addEventListener('resize', () => this.onResize());

    // Keyboard for inventory selection
    this.setupInventoryInput();

    // Click handlers for block break/place
    this.setupBlockInteraction();

    // ESC for help
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    ambient.name = 'ambient';
    this.scene.add(ambient);

    // Directional light (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.name = 'sun';
    this.scene.add(sun);
  }

  private generateWorld(): void {
    this.world.generateEmpty();
    const terrainGen = new TerrainGen(CONFIG.seed);
    terrainGen.generate(this.world);

    // Scan for the best land spawn point near the world center.
    const centerX = Math.floor(WORLD_SIZE_X / 2);
    const centerZ = Math.floor(WORLD_SIZE_Z / 2);
    const { spawnX, spawnZ } = findBestLandSpawnNear(
      (x, y, z) => this.world.getBlock(x, y, z),
      centerX, centerZ, 16, 2, WATER_LEVEL,
    );

    // Build the redstone demo BEFORE meshing so it is included in the initial chunk meshes.
    this.buildRedstoneDemo(spawnX, spawnZ);
    this.redstoneSystem.refreshFromWorld(this.world);

    // Build all chunk meshes
    this.meshBuilder.buildAll();

    // Add meshes to scene
    for (const mesh of this.meshBuilder.getOpaqueMeshes()) {
      this.scene.add(mesh);
    }
    for (const mesh of this.meshBuilder.getTransparentMeshes()) {
      this.scene.add(mesh);
    }

    // Set player spawn to highest block at center
    for (let y = WORLD_SIZE_Y - 1; y >= 0; y--) {
      const block = this.world.getBlock(spawnX, y, spawnZ);
      if (block !== BlockType.Air && block !== BlockType.Water) {
        this.player.state.position.set(spawnX + 0.5, y + 1, spawnZ + 0.5);
        break;
      }
    }

    // Spawn mobs
    this.mobManager.spawnPigs(this.world, 4);
  }

  /**
   * Build a redstone demo near the spawn point.
   * Shows: RedstoneBlock -> dust -> Lamp (always lit), torch NOT gate, Lever -> Lamp (unlit).
   */
  private buildRedstoneDemo(spawnX: number, spawnZ: number): void {
    const px = spawnX;
    const pz = spawnZ - 6;   // in front of the player (player looks toward -z)
    const surfaceY = this.findSurfaceY(px, pz);
    if (surfaceY < 0) return;

    // Find the water surface at the demo location so the platform is built above it.
    let waterTop = -1;
    for (let y = WORLD_SIZE_Y - 1; y >= 0; y--) {
      if (this.world.getBlock(px, y, pz) === BlockType.Water) { waterTop = y; break; }
    }

    // Raise the platform well above the terrain so the demo is clearly visible.
    let topY = Math.max(surfaceY + 20, waterTop + 10); // platform top
    let cy = topY + 1;                                 // component height (on top of platform)
    // Clamp to world bounds — if the platform would exceed the world, lower it.
    if (cy >= WORLD_SIZE_Y) {
      cy = WORLD_SIZE_Y - 1;
      topY = cy - 1;
    }

    // Pillar (1x1) from the surface up to just below the platform.
    for (let y = surfaceY + 1; y < topY; y++) {
      this.world.setBlock(px, y, pz, BlockType.Planks);
    }
    // Platform (13 x 3) at the top, and clear the air above it.
    for (let dx = -6; dx <= 6; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.world.setBlock(px + dx, topY, pz + dz, BlockType.Planks);
        this.world.setBlock(px + dx, cy, pz + dz, BlockType.Air);
      }
    }

    // Demo A (always lit): RedstoneBlock -> dust -> Lamp
    this.placeRedstone(px - 5, cy, pz, BlockType.RedstoneBlock);
    this.placeRedstone(px - 4, cy, pz, BlockType.RedstoneDust);
    this.placeRedstone(px - 3, cy, pz, BlockType.RedstoneDust);
    this.placeRedstone(px - 2, cy, pz, BlockType.RedstoneLamp);

    // Demo B (torch, lit): Torch on platform -> Lamp
    this.placeRedstone(px + 1, cy, pz, BlockType.RedstoneTorch);
    this.placeRedstone(px + 2, cy, pz, BlockType.RedstoneLamp);

    // Demo C (lever OFF -> unlit lamp): Lever -> dust -> Lamp
    this.placeRedstone(px + 4, cy, pz, BlockType.Lever);
    this.placeRedstone(px + 5, cy, pz, BlockType.RedstoneDust);
    this.placeRedstone(px + 6, cy, pz, BlockType.RedstoneLamp);

    // Expose the demo center for automated camera aiming.
    this.demoCenter = [px, cy, pz];

    // Remesh the affected area.
    this.scheduleRemesh(px, cy, pz);
  }

  /** Place a redstone component block and register it with the redstone system. */
  private placeRedstone(x: number, y: number, z: number, type: BlockType): void {
    this.world.setBlock(x, y, z, type);
    this.redstoneSystem.registerComponent(x, y, z, type);
  }

  /** Find the surface Y at a given X, Z. */
  private findSurfaceY(x: number, z: number): number {
    return findSurfaceYUtil((bx, by, bz) => this.world.getBlock(bx, by, bz), x, z);
  }

  private setupInventoryInput(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.started || !this.player.isPointerLocked()) return;
      // Number keys 1-9
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        this.inventory.selectSlot(num - 1);
      }
    });

    // Wheel for inventory
    document.addEventListener('wheel', (e) => {
      if (!this.started || !this.player.isPointerLocked()) return;
      if (e.deltaY > 0) this.inventory.nextSlot();
      else this.inventory.prevSlot();
    });
  }

  private setupBlockInteraction(): void {
    document.addEventListener('mousedown', (e) => {
      if (!this.started || !this.player.isPointerLocked()) return;
      if (e.button === 0) {
        this.breakBlock();
      } else if (e.button === 2) {
        this.rightClickBlock();
      }
    });

    // Prevent context menu on right click
    this.renderer.domElement.addEventListener('contextmenu', (_e: Event) => _e.preventDefault());
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      if (this.helpVisible) {
        this.helpOverlay.hide();
        this.helpVisible = false;
        // Re-lock pointer if game started
        if (this.started) {
          this.player.lock();
        }
      } else if (this.started && this.player.isPointerLocked()) {
        this.helpOverlay.show();
        this.helpVisible = true;
        this.player.unlock();
      }
    }
  }

  private breakBlock(): void {
    const result = this.getRaycastResult();
    if (result && result.hit) {
      const { x, y, z } = result.blockPos;
      const block = this.world.getBlock(x, y, z);
      if (isBreakable(block)) {
        // Unregister redstone component if present
        if (isRedstoneComponent(block)) {
          this.redstoneSystem.unregisterComponent(x, y, z);
        }
        this.world.setBlock(x, y, z, BlockType.Air);
        this.scheduleRemesh(x, y, z);
        // Spawn particles
        this.particles.spawn(x, y, z, block);
        // Play sound
        this.soundManager.play('break');
      }
    }
  }

  private rightClickBlock(): void {
    const result = this.getRaycastResult();
    if (result && result.hit) {
      const { x, y, z } = result.blockPos;
      const block = this.world.getBlock(x, y, z);

      // Check if it's a redstone component - interact with it
      if (isRedstoneComponent(block)) {
        const shiftHeld = false; // Could check e.shiftKey in a full implementation
        this.redstoneSystem.interact(x, y, z, shiftHeld);
        this.scheduleRemesh(x, y, z);
        return;
      }

      // Check if placing on an existing redstone component
      const prevBlock = this.world.getBlock(result.prevPos.x, result.prevPos.y, result.prevPos.z);
      if (isRedstoneComponent(prevBlock)) {
        const shiftHeld = false;
        this.redstoneSystem.interact(result.prevPos.x, result.prevPos.y, result.prevPos.z, shiftHeld);
        this.scheduleRemesh(result.prevPos.x, result.prevPos.y, result.prevPos.z);
        return;
      }

      // Normal block placement
      this.placeBlock();
    }
  }

  private placeBlock(): void {
    const result = this.getRaycastResult();
    if (result && result.hit) {
      const { x, y, z } = result.prevPos;
      const blockType = this.inventory.getSelectedBlockType();
      // Don't place inside player
      const px = this.player.state.position.x;
      const py = this.player.state.position.y;
      const pz = this.player.state.position.z;
      const hw = this.player.state.width;
      const ph = this.player.state.height;
      if (x + 1 > px - hw && x < px + hw && y + 1 > py && y < py + ph && z + 1 > pz - hw && z < pz + hw) {
        return; // Too close to player
      }
      if (this.world.setBlock(x, y, z, blockType)) {
        // Register redstone component if applicable
        if (isRedstoneComponent(blockType)) {
          this.redstoneSystem.registerComponent(x, y, z, blockType);
        }
        this.scheduleRemesh(x, y, z);
        // Play sound
        this.soundManager.play('place');
      }
    }
  }

  private getRaycastResult(): RaycastResult | null {
    const camPos = this.player.camera.position;
    const dir = new THREE.Vector3();
    this.player.camera.getWorldDirection(dir);
    return raycast(this.world, camPos, dir);
  }

  private scheduleRemesh(wx: number, wy: number, wz: number): void {
    const key = `${Math.floor(wx / CONFIG.chunk.sizeX)},${Math.floor(wz / CONFIG.chunk.sizeZ)}`;
    this.blockChangeSet.add(key);

    // Also mark adjacent chunks if on boundary
    const lx = wx % CONFIG.chunk.sizeX;
    const lz = wz % CONFIG.chunk.sizeZ;
    if (lx === 0) this.blockChangeSet.add(`${Math.floor(wx / CONFIG.chunk.sizeX) - 1},${Math.floor(wz / CONFIG.chunk.sizeZ)}`);
    if (lx === CONFIG.chunk.sizeX - 1) this.blockChangeSet.add(`${Math.floor(wx / CONFIG.chunk.sizeX) + 1},${Math.floor(wz / CONFIG.chunk.sizeZ)}`);
    if (lz === 0) this.blockChangeSet.add(`${Math.floor(wx / CONFIG.chunk.sizeX)},${Math.floor(wz / CONFIG.chunk.sizeZ) - 1}`);
    if (lz === CONFIG.chunk.sizeZ - 1) this.blockChangeSet.add(`${Math.floor(wx / CONFIG.chunk.sizeX)},${Math.floor(wz / CONFIG.chunk.sizeZ) + 1}`);
  }

  private scheduleRemeshChunk(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    this.blockChangeSet.add(key);
  }

  private processBlockChanges(): void {
    if (this.blockChangeSet.size === 0) return;
    for (const key of this.blockChangeSet) {
      const [cxStr, czStr] = key.split(',');
      // Capture old meshes BEFORE buildChunk replaces them
      const oldMeshes = this.meshBuilder.getChunkMesh(key);
      if (oldMeshes) {
        if (oldMeshes.opaque) this.scene.remove(oldMeshes.opaque);
        if (oldMeshes.transparent) this.scene.remove(oldMeshes.transparent);
      }
      this.meshBuilder.buildChunk(parseInt(cxStr), parseInt(czStr));
      const meshes = this.meshBuilder.getChunkMesh(key);
      if (meshes) {
        if (meshes.opaque) this.scene.add(meshes.opaque);
        if (meshes.transparent) this.scene.add(meshes.transparent);
      }
    }
    this.blockChangeSet.clear();
  }

  private removeMeshesForKey(key: string): void {
    const meshes = this.meshBuilder.getChunkMesh(key);
    if (!meshes) return;
    if (meshes.opaque) this.scene.remove(meshes.opaque);
    if (meshes.transparent) this.scene.remove(meshes.transparent);
  }

  private updateBlockHighlight(): void {
    const result = this.getRaycastResult();
    if (result && result.hit) {
      this.blockHighlight.visible = true;
      this.blockHighlight.position.set(
        result.blockPos.x + 0.5,
        result.blockPos.y + 0.5,
        result.blockPos.z + 0.5,
      );
    } else {
      this.blockHighlight.visible = false;
    }
  }

  private updateLighting(): void {
    const ambient = this.scene.getObjectByName('ambient') as THREE.AmbientLight;
    const sun = this.scene.getObjectByName('sun') as THREE.DirectionalLight;
    if (ambient && sun) {
      const ambientIntensity = this.dayNight.getAmbientIntensity();
      const directionalIntensity = this.dayNight.getDirectionalIntensity();
      ambient.intensity = ambientIntensity;
      sun.intensity = directionalIntensity;

      const sunDir = this.dayNight.getSunDirection();
      sun.position.set(sunDir.x * 100, sunDir.y * 100, sunDir.z * 100);

      const skyColor = this.dayNight.getSkyColor();
      this.scene.background = skyColor;
      this.scene.fog!.color = skyColor;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = this.dayNight.getFogDensity();
      }
    }
  }

  /** Start the game loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.started = true;
    this.startScreen.hide();
    this.player.lock();
    this.hud.show();

    // Initialize audio on first user gesture
    this.soundManager.initialize();

    this.gameLoop();
  }

  /** The main game loop. */
  private gameLoop = (): void => {
    if (!this.running) return;
    requestAnimationFrame(this.gameLoop);

    const rawDt = Math.min(this.clock.getDelta(), 0.1);

    // Update day/night
    this.dayNight.update(rawDt);

    // Update redstone time of day
    this.redstoneSystem.setTimeOfDay(this.dayNight.timeOfDay);

    // Fixed timestep accumulator for physics
    this.accumulator += rawDt;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 5) {
      this.physics.step(this.player, FIXED_DT);
      this.accumulator -= FIXED_DT;
      this.tickCount++;

      // Redstone simulation (20 TPS)
      this.redstoneSystem.tick();

      // Fluid simulation (20 TPS)
      this.fluids.tick(this.tickCount);

      // Mob update
      this.mobManager.update(FIXED_DT);

      steps++;
    }

    // Update particles (render loop, not fixed timestep)
    this.particles.update(rawDt);

    // Update camera
    this.player.updateCamera();

    // Process deferred block changes (remesh)
    this.processBlockChanges();

    // Update lighting
    this.updateLighting();

    // Update block highlight
    this.updateBlockHighlight();

    // Render
    this.renderer.render(this.scene, this.player.camera);

    // Update HUD
    const pos = this.player.state.position;
    const fps = this.accumulator < rawDt ? Math.round(1 / rawDt) : 60;
    this.hud.update(pos, fps);
  };

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.player.camera.aspect = w / h;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** Stop the game loop. */
  stop(): void {
    this.running = false;
    this.meshBuilder.dispose();
    this.renderer.dispose();
    this.mobManager.dispose();
    this.particles.dispose();
  }

  /** Save world state to localStorage. */
  saveGame(): boolean {
    const pos = this.player.state.position;
    return this.saveSystem.save(
      this.world,
      { x: pos.x, y: pos.y, z: pos.z },
      this.dayNight.timeOfDay,
    );
  }

  /** Load world state from localStorage. */
  loadGame(): boolean {
    const data = this.saveSystem.load();
    if (!data) return false;

    // Restore chunks
    const chunks = this.world.getAllChunks();
    for (let i = 0; i < chunks.length && i < data.chunks.length; i++) {
      chunks[i].data = data.chunks[i];
      chunks[i].dirty = true;
    }

    // Restore player position
    this.player.state.position.set(data.player.x, data.player.y, data.player.z);

    // Restore time
    this.dayNight.timeOfDay = data.timeOfDay;

    // Rebuild all chunk meshes
    this.meshBuilder.buildAll();

    // Re-add meshes to scene
    for (const mesh of this.meshBuilder.getOpaqueMeshes()) {
      this.scene.add(mesh);
    }
    for (const mesh of this.meshBuilder.getTransparentMeshes()) {
      this.scene.add(mesh);
    }

    return true;
  }
}
