import {
  RedstoneStateStore,
  RedstoneComponentType,
  RedstoneCtx,
  posKey,
  parsePosKey,
  getComponentType,
} from './RedstoneTypes.js';
import { PowerGrid } from './PowerGrid.js';
import { ComponentRegistry } from './components/ComponentRegistry.js';
import { CONFIG } from '../config.js';

/**
 * RedstoneSystem: orchestrates all redstone logic.
 * Called each tick at 20 TPS from the Game loop.
 */
export class RedstoneSystem {
  public stateStore: RedstoneStateStore;
  public powerGrid: PowerGrid;
  public registry: ComponentRegistry;

  /** World reference for block queries. */
  private world: {
    getBlock: (x: number, y: number, z: number) => number;
    setBlock: (x: number, y: number, z: number, type: number) => boolean;
  };

  /** Callback for scheduling remesh. */
  private onRemesh: (cx: number, cz: number) => void;

  /** Callback for playing sounds. */
  private onPlaySound: (name: string) => void;

  /** Current tick count. */
  private tickCount: number = 0;

  /** Current time of day. */
  private timeOfDay: number = 0.25;

  /** Cached ctx for render queries (avoids creating per-call ctx). */
  private renderCtx: RedstoneCtx | null = null;

  constructor(
    world: { getBlock: (x: number, y: number, z: number) => number; setBlock: (x: number, y: number, z: number, type: number) => boolean },
    onRemesh: (cx: number, cz: number) => void,
    onPlaySound: (name: string) => void,
  ) {
    this.world = world;
    this.onRemesh = onRemesh;
    this.onPlaySound = onPlaySound;
    this.stateStore = new RedstoneStateStore();
    this.powerGrid = new PowerGrid();
    this.registry = new ComponentRegistry();
  }

  /** Register a new redstone component at the given position. */
  registerComponent(x: number, y: number, z: number, blockType: number): void {
    const componentType = getComponentType(blockType);
    if (!componentType) return;

    const key = posKey(x, y, z);

    // Create default state
    const state: any = {
      facing: 0,
      delay: 1,
      mode: 0,
      on: false,
      pressedTicks: 0,
      fuse: 0,
      extended: false,
      lockedLevel: -1,
      lastObserved: '',
      cooldown: 0,
      note: 0,
      inputLevel: 0,
      inputChanged: false,
      prevOutput: 0,
      powered: false,
      prevLit: false,
      inverted: false,
      _delayCounter: 0,
    };

    // Set type-specific defaults
    if (blockType === 19) state.delay = 1; // Repeater
    if (blockType === 22 || blockType === 23) state.facing = 2; // Piston default up
    if (blockType === 21) state.facing = 2; // Observer default up

    this.stateStore.set(x, y, z, state);
  }

  /** Unregister a redstone component at the given position. */
  unregisterComponent(x: number, y: number, z: number): void {
    this.stateStore.remove(x, y, z);
  }

  /** Refresh component registry from world state. */
  refreshFromWorld(world: { getBlock: (x: number, y: number, z: number) => number }): void {
    this.stateStore.clear();

    // Scan all positions for redstone components
    const width = 128, height = 64, depth = 128;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          const blockType = world.getBlock(x, y, z);
          if (this.isRedstoneBlockType(blockType)) {
            this.registerComponent(x, y, z, blockType);
          }
        }
      }
    }
  }

  /** Check if a block type is a redstone component. */
  private isRedstoneBlockType(type: number): boolean {
    return type >= 13 && type <= 29;
  }

  /**
   * Main tick method. Called each fixed timestep (20 TPS).
   *
   * Order:
   * 1. Feed timeOfDay to daylight detectors
   * 2. Advance button press timers
   * 3. PowerGrid.recompute
   * 4. Update components (repeater/comparator delay, observer, lamp, piston, TNT, note)
   */
  tick(): void {
    this.tickCount++;

    // Step 1: Update daylight detectors with current time
    this.updateDaylightDetectors();

    // Step 2: Recompute power grid
    this.powerGrid.recompute(
      (x, y, z) => this.world.getBlock(x, y, z),
      this.stateStore,
    );

    // Step 4: Update components
    this.updateComponents();
  }

  /** Update daylight detector states based on time of day. */
  private updateDaylightDetectors(): void {
    for (const [key, state] of this.stateStore.getAll()) {
      const [x, y, z] = parsePosKey(key);
      const blockType = this.world.getBlock(x, y, z);
      if (blockType !== 25) continue; // DaylightDetector

      const sunLevel = this.getSunLevel(this.timeOfDay);
      const inverted = state.inverted || false;
      const output = inverted ? 15 - sunLevel : sunLevel;

      // Update the state for PowerGrid to pick up
      state.on = output > 0;
    }
  }

  /** Get sun level (0-15) from time of day. */
  private getSunLevel(timeOfDay: number): number {
    const sunHeight = Math.sin(timeOfDay * Math.PI * 2);
    return Math.max(0, Math.min(15, Math.round((sunHeight + 1) * 7.5)));
  }

  /** Update all redstone components. */
  private updateComponents(): void {
    const ctx = this.createCtx();

    for (const [key, state] of this.stateStore.getAll()) {
      const [x, y, z] = parsePosKey(key);
      const blockType = this.world.getBlock(x, y, z);
      const componentType = getComponentType(blockType);
      if (!componentType) continue;

      // Get the component instance from registry
      const component = this.registry.get(componentType);
      if (!component) continue;

      // Tick the component with world coordinates
      component.tick(state, ctx, x, y, z);
    }
  }

  /** Create the context object for component tick methods. */
  private createCtx(): RedstoneCtx {
    const powerGrid = this.powerGrid;
    const stateStore = this.stateStore;
    const world = this.world;
    const onRemesh = this.onRemesh;
    const onPlaySound = this.onPlaySound;
    const timeOfDay = this.timeOfDay;
    const tickCount = this.tickCount;

    return {
      world: {
        getBlock: (x: number, y: number, z: number) => world.getBlock(x, y, z),
        setBlock: (x: number, y: number, z: number, type: number) => world.setBlock(x, y, z, type),
      },
      stateStore,
      power: {
        isPowered: (x: number, y: number, z: number) => powerGrid.isPowered(x, y, z),
        isStronglyPowered: (x: number, y: number, z: number) => powerGrid.isStronglyPowered(x, y, z),
        dustLevel: (x: number, y: number, z: number) => powerGrid.getDustLevel(x, y, z),
        hasPoweredDustNeighbor: (x: number, y: number, z: number) => powerGrid.hasPoweredDustNeighbor(x, y, z),
        hasPoweredDustOnTop: (x: number, y: number, z: number) => powerGrid.hasPoweredDustOnTop(x, y, z),
      },
      timeOfDay,
      tickCount,
      scheduleRemesh: (x: number, y: number, z: number) => {
        const cx = Math.floor(x / CONFIG.chunk.sizeX);
        const cz = Math.floor(z / CONFIG.chunk.sizeZ);
        onRemesh(cx, cz);
      },
      playSound: (name: string) => onPlaySound(name),
    };
  }

  /** Get the texture key for a component at a position. */
  getTextureKey(x: number, y: number, z: number): string | null {
    const blockType = this.world.getBlock(x, y, z);
    const componentType = getComponentType(blockType);
    if (!componentType) return null;

    const state = this.stateStore.get(x, y, z);
    if (!state) return null;

    const component = this.registry.get(componentType);
    if (!component) return null;

    return component.getTextureKey(state, this.ensureRenderCtx(), x, y, z);
  }

  /** Get the dust level for rendering at a position. */
  getDustRenderLevel(x: number, y: number, z: number): number {
    return this.powerGrid.getDustLevel(x, y, z);
  }

  /** Get the render texture key for a component at a position. */
  getRenderTextureKey(x: number, y: number, z: number): string | null {
    return this.getTextureKey(x, y, z);
  }

  /** Ensure the render ctx is cached and available. */
  private ensureRenderCtx(): RedstoneCtx {
    if (!this.renderCtx) {
      this.renderCtx = this.createCtx();
    }
    return this.renderCtx;
  }

  /** Set the time of day. Called by Game each frame. */
  setTimeOfDay(timeOfDay: number): void {
    this.timeOfDay = timeOfDay;
  }

  /** Get the current time of day. */
  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  /** Get all component positions. */
  getComponentPositions(): [number, number, number][] {
    return this.stateStore.getPositions();
  }

  /** Check if a position has a redstone component. */
  hasComponent(x: number, y: number, z: number): boolean {
    return this.stateStore.has(x, y, z);
  }

  /** Get the state of a component at a position. */
  getComponentState(x: number, y: number, z: number): any | null {
    return this.stateStore.get(x, y, z) ?? null;
  }

  /** Interact with a component at a position. */
  interact(x: number, y: number, z: number, shiftHeld: boolean = false): boolean {
    const blockType = this.world.getBlock(x, y, z);
    const componentType = getComponentType(blockType);
    if (!componentType) return false;

    const state = this.stateStore.get(x, y, z);
    if (!state) return false;

    const component = this.registry.get(componentType);
    if (!component) return false;

    if (shiftHeld && componentType === RedstoneComponentType.Repeater) {
      // Cycle delay
      state.delay = ((state.delay % 4) + 1);
      return true;
    }

    if (shiftHeld && componentType === RedstoneComponentType.Comparator) {
      // Toggle mode
      state.mode = state.mode === 0 ? 1 : 0;
      return true;
    }

    component.interact(state, this.ensureRenderCtx(), x, y, z);
    return true;
  }
}
