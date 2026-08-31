import { DIR_DELTAS, posKey, RedstoneStateStore } from './RedstoneTypes.js';

/**
 * Power grid: computes signal propagation via BFS from strong sources.
 * Signal strength ranges 0-15, decaying by 1 per dust block.
 *
 * Handles torch inversion via fixed-point iteration.
 */
export class PowerGrid {
  private dustLevels: Map<string, number> = new Map();
  private strongSources: Set<string> = new Set();

  getDustLevel(x: number, y: number, z: number): number {
    return this.dustLevels.get(posKey(x, y, z)) ?? 0;
  }

  hasPoweredDust(x: number, y: number, z: number): boolean {
    return this.getDustLevel(x, y, z) > 0;
  }

  hasPoweredDustNeighbor(x: number, y: number, z: number): boolean {
    for (let d = 0; d < 6; d++) {
      const [nx, ny, nz] = this.neighbor(x, y, z, d);
      if (this.hasPoweredDust(nx, ny, nz)) return true;
    }
    return false;
  }

  hasPoweredDustOnTop(x: number, y: number, z: number): boolean {
    return this.hasPoweredDust(x, y + 1, z);
  }

  isStronglyPowered(x: number, y: number, z: number): boolean {
    return this.strongSources.has(posKey(x, y, z));
  }

  isPowered(x: number, y: number, z: number): boolean {
    if (this.isStronglyPowered(x, y, z)) return true;
    if (this.hasPoweredDustNeighbor(x, y, z)) return true;
    if (this.hasPoweredDustOnTop(x, y, z)) return true;
    return false;
  }

  private neighbor(x: number, y: number, z: number, dir: number): [number, number, number] {
    const [dx, dy, dz] = DIR_DELTAS[dir];
    return [x + dx, y + dy, z + dz];
  }

  private runBFS(
    sources: Map<string, number>,
    getBlock: (x: number, y: number, z: number) => number,
  ): Map<string, number> {
    const levels: Map<string, number> = new Map();
    const queue: [number, number, number, number][] = [];
    const inQueue = new Set<string>();

    for (const [key, level] of sources) {
      const [x, y, z] = key.split(',').map(Number);
      queue.push([x, y, z, level]);
      inQueue.add(key);
    }

    while (queue.length > 0) {
      const [x, y, z, level] = queue.shift()!;
      inQueue.delete(posKey(x, y, z));
      if (level <= 0) continue;

      for (let d = 0; d < 6; d++) {
        const [nx, ny, nz] = this.neighbor(x, y, z, d);
        const nKey = posKey(nx, ny, nz);
        const neighborBlock = getBlock(nx, ny, nz);
        if (neighborBlock !== 13) continue;

        const newLevel = Math.max(0, Math.min(15, level - 1));
        if (newLevel <= 0) continue;

        const currentLevel = levels.get(nKey) ?? 0;
        if (newLevel > currentLevel) {
          levels.set(nKey, newLevel);
          if (!inQueue.has(nKey)) {
            inQueue.add(nKey);
            queue.push([nx, ny, nz, newLevel]);
          }
        }
      }
    }

    return levels;
  }

  /**
   * Get the support block position for a torch at (x, y, z).
   * Returns the position of the block the torch is attached to.
   */
  private getTorchSupport(x: number, y: number, z: number, getBlock: (x: number, y: number, z: number) => number): [number, number, number] | null {
    // Check block below
    const below = getBlock(x, y - 1, z);
    if (below !== 0) {
      return [x, y - 1, z];
    }
    // Check sides for wall-mounted torch
    for (let d = 0; d < 6; d++) {
      const [nx, ny, nz] = this.neighbor(x, y, z, d);
      if (getBlock(nx, ny, nz) !== 0) {
        return [nx, ny, nz];
      }
    }
    return null;
  }

  /**
   * Recompute the entire power grid with fixed-point iteration for torch inversion.
   */
  recompute(
    getBlock: (x: number, y: number, z: number) => number,
    stateStore: RedstoneStateStore,
  ): void {
    this.dustLevels.clear();
    this.strongSources.clear();

    const maxIterations = 10;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Collect sources (including lit torches)
      const sources = this.collectSources(getBlock, stateStore);

      // Run BFS
      this.dustLevels = this.runBFS(sources, getBlock);
      this.strongSources.clear();
      for (const key of sources.keys()) {
        this.strongSources.add(key);
      }

      // Power solid blocks adjacent to sources or powered dust
      this.powerSolidBlocks(getBlock, stateStore, sources);

      // Update torch states: a torch is lit if its support is NOT powered
      // IMPORTANT: when checking if support is powered, exclude the torch's own contribution
      let torchChanged = false;
      for (const [key, state] of stateStore.getAll()) {
        const [x, y, z] = key.split(',').map(Number);
        const blockType = getBlock(x, y, z);
        if (blockType !== 14) continue; // Only torches

        const support = this.getTorchSupport(x, y, z, getBlock);
        if (!support) continue;

        const [sx, sy, sz] = support;
        const supportKey = posKey(sx, sy, sz);

        // Check if support is powered, excluding this torch's own contribution
        let supportPowered = false;

        // Check if support is a strong source (but not this torch)
        if (this.strongSources.has(supportKey) && supportKey !== key) {
          supportPowered = true;
        }

        // Check if support is adjacent to powered dust (but not dust that got its power from this torch)
        if (!supportPowered) {
          for (let d = 0; d < 6; d++) {
            const [nx, ny, nz] = this.neighbor(sx, sy, sz, d);
            const nKey = posKey(nx, ny, nz);
            if (this.hasPoweredDust(nx, ny, nz) && nKey !== key) {
              supportPowered = true;
              break;
            }
          }
        }

        // Check if support has powered dust on top
        if (!supportPowered && this.hasPoweredDust(sx, sy + 1, sz)) {
          supportPowered = true;
        }

        const shouldBeOn = !supportPowered;
        if (state.on !== shouldBeOn) {
          state.on = shouldBeOn;
          torchChanged = true;
        }
      }

      // If no torch states changed, we've converged
      if (!torchChanged) break;
    }
  }

  private collectSources(
    getBlock: (x: number, y: number, z: number) => number,
    stateStore: RedstoneStateStore,
  ): Map<string, number> {
    const sources = new Map<string, number>();
    for (const [key, state] of stateStore.getAll()) {
      const [x, y, z] = key.split(',').map(Number);
      const blockType = getBlock(x, y, z);
      const level = this.getComponentSourceLevel(blockType, state);
      if (level > 0) {
        sources.set(key, level);
      }
    }
    return sources;
  }

  private getComponentSourceLevel(blockType: number, state: any): number {
    if (blockType === 18) return 15; // RedstoneBlock
    if (blockType === 28) return 15; // RedstoneOre
    if (blockType === 14) return state.on ? 15 : 0; // RedstoneTorch
    if (blockType === 16) return state.on ? 15 : 0; // Lever
    if (blockType === 17) return state.pressedTicks > 0 ? 15 : 0; // Button
    if (blockType === 19) return state.on ? 15 : 0; // Repeater
    if (blockType === 20) return state.on ? Math.max(0, state.lockedLevel) : 0; // Comparator
    if (blockType === 21) return state.cooldown > 0 ? 15 : 0; // Observer
    if (blockType === 22 || blockType === 23) return state.extended ? 15 : 0; // Piston
    if (blockType === 24) return state.fuse > 0 ? 15 : 0; // TNT
    if (blockType === 25) return state.prevOutputLevel ?? (state.on ? 15 : 0); // DaylightDetector
    return 0;
  }

  private powerSolidBlocks(
    getBlock: (x: number, y: number, z: number) => number,
    stateStore: RedstoneStateStore,
    sources: Map<string, number>,
  ): void {
    const toPower = new Set<string>();

    // Find all torch support blocks to exclude them from being powered by torches
    const torchSupportBlocks = new Set<string>();
    for (const [key] of stateStore.getAll()) {
      const [x, y, z] = key.split(',').map(Number);
      const blockType = getBlock(x, y, z);
      if (blockType === 14) { // RedstoneTorch
        const support = this.getTorchSupport(x, y, z, getBlock);
        if (support) {
          torchSupportBlocks.add(posKey(...support));
        }
      }
    }

    // Add positions adjacent to strong sources
    for (const key of sources.keys()) {
      const [x, y, z] = key.split(',').map(Number);
      const blockType = getBlock(x, y, z);

      // Directional components (comparator, repeater) only power via their tick output,
      // not via adjacent power spread. This prevents self-feedback through side inputs.
      const isDirectional = blockType === 19 || blockType === 20;

      for (let d = 0; d < 6; d++) {
        const [nx, ny, nz] = this.neighbor(x, y, z, d);
        const nKey = posKey(nx, ny, nz);

        // Skip if this is a torch support block and the source is a torch
        if (torchSupportBlocks.has(nKey) && blockType === 14) {
          continue;
        }

        // Skip side-adjacent blocks for directional components
        if (isDirectional) continue;

        const neighborBlock = getBlock(nx, ny, nz);
        if (neighborBlock !== 0 && neighborBlock !== 13 && neighborBlock !== 14) {
          toPower.add(nKey);
        }
      }
    }

    // Add positions adjacent to powered dust
    for (const [key, level] of this.dustLevels) {
      if (level <= 0) continue;
      const [x, y, z] = key.split(',').map(Number);
      for (let d = 0; d < 6; d++) {
        const [nx, ny, nz] = this.neighbor(x, y, z, d);
        const nKey = posKey(nx, ny, nz);
        const neighborBlock = getBlock(nx, ny, nz);
        if (neighborBlock !== 0 && neighborBlock !== 13 && neighborBlock !== 14) {
          toPower.add(nKey);
        }
      }
    }

    // Add positions with powered dust on top
    for (const [key, level] of this.dustLevels) {
      if (level <= 0) continue;
      const [x, y, z] = key.split(',').map(Number);
      const belowBlock = getBlock(x, y - 1, z);
      if (belowBlock !== 0 && belowBlock !== 13 && belowBlock !== 14) {
        toPower.add(posKey(x, y - 1, z));
      }
    }

    for (const key of toPower) {
      this.strongSources.add(key);
    }
  }

  getRenderDustLevel(x: number, y: number, z: number): number {
    return this.getDustLevel(x, y, z);
  }

  clear(): void {
    this.dustLevels.clear();
    this.strongSources.clear();
  }
}
