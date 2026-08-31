import { World } from './World.js';
import { BlockType, isSolid } from './BlockTypes.js';
import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z } from '../config.js';

const CHUNK_SIZE_X = CONFIG.chunk.sizeX;
const CHUNK_SIZE_Y = CONFIG.chunk.sizeY;
const CHUNK_SIZE_Z = CONFIG.chunk.sizeZ;

/** Direction deltas for 6-neighbor lookup. */
const DIR_DELTAS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

/**
 * Fluid simulation: simple diffusion for Water and Lava.
 * - Water flows every tick; Lava flows every 3 ticks.
 * - Flows downward first, then horizontally.
 * - Only flows into Air blocks.
 * - Does not overwrite solid blocks.
 * - Caps total fluid blocks added per tick for performance.
 */
export class Fluids {
  private world: World;

  /** Callback to schedule chunk remesh on fluid changes. */
  public onBlockChanged: ((wx: number, wy: number, wz: number) => void) | null = null;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Tick the fluid simulation.
   * @param tickCount - Current tick count (used to determine Lava frequency).
   * @param maxAdditions - Maximum fluid blocks to add per tick.
   */
  tick(tickCount: number, maxAdditions: number = 512): number {
    let additions = 0;

    // Lava flows every 3 ticks, Water flows every tick
    if (tickCount % 3 !== 0) {
      // Still process water every tick
      additions += this.tickFluid(BlockType.Water, tickCount, maxAdditions);
      return additions;
    }

    additions += this.tickFluid(BlockType.Water, tickCount, maxAdditions);
    additions += this.tickFluid(BlockType.Lava, tickCount, maxAdditions - additions);
    return additions;
  }

  private tickFluid(
    fluidType: BlockType,
    tickCount: number,
    maxAdditions: number,
  ): number {
    let additions = 0;

    // Collect all fluid blocks first (avoid modifying during iteration)
    const fluidBlocks: [number, number, number][] = [];

    for (let cx = 0; cx < CONFIG.world.chunksX; cx++) {
      for (let cz = 0; cz < CONFIG.world.chunksZ; cz++) {
        const chunk = this.world.getChunkAt(cx * CHUNK_SIZE_X, cz * CHUNK_SIZE_Z);
        if (!chunk) continue;
        for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
          for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
            for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
              if (chunk.getLocal(lx, ly, lz) === fluidType) {
                const wx = cx * CHUNK_SIZE_X + lx;
                const wy = ly;
                const wz = cz * CHUNK_SIZE_Z + lz;
                fluidBlocks.push([wx, wy, wz]);
              }
            }
          }
        }
      }
    }

    // For each fluid block, try to flow
    for (const [wx, wy, wz] of fluidBlocks) {
      if (additions >= maxAdditions) break;

      // Check if the source block still exists (may have been removed by another fluid flow)
      if (this.world.getBlock(wx, wy, wz) !== fluidType) continue;

      // Priority 1: Flow downward
      if (additions < maxAdditions) {
        const below = this.world.getBlock(wx, wy - 1, wz);
        if (below === BlockType.Air) {
          this.setFluid(wx, wy - 1, wz, fluidType);
          additions++;
          continue; // This block now flows further down next tick
        }
      }

      // Priority 2: Flow horizontally in all 4 cardinal directions
      if (additions >= maxAdditions) break;

      const horizontalDirs = [
        [1, 0, 0], [-1, 0, 0],
        [0, 0, 1], [0, 0, -1],
      ];

      // Shuffle for randomness
      for (let i = horizontalDirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [horizontalDirs[i], horizontalDirs[j]] = [horizontalDirs[j], horizontalDirs[i]];
      }

      for (const [dx, , dz] of horizontalDirs) {
        if (additions >= maxAdditions) break;
        const nx = wx + dx;
        const nz = wz + dz;
        const neighbor = this.world.getBlock(nx, wy, nz);
        if (neighbor === BlockType.Air) {
          this.setFluid(nx, wy, nz, fluidType);
          additions++;
        }
      }
    }

    return additions;
  }

  private setFluid(wx: number, wy: number, wz: number, type: BlockType): void {
    if (wx < 0 || wx >= WORLD_SIZE_X || wy < 0 || wy >= WORLD_SIZE_Y || wz < 0 || wz >= WORLD_SIZE_Z) {
      return;
    }
    // Don't overwrite solid blocks
    const current = this.world.getBlock(wx, wy, wz);
    if (isSolid(current)) return;
    // Don't overwrite other fluid types (water doesn't replace lava and vice versa)
    if (current === BlockType.Water || current === BlockType.Lava) return;

    this.world.setBlock(wx, wy, wz, type);
    this.onBlockChanged?.(wx, wy, wz);
  }

  /**
   * Pure function: check if a block at world coords is a fluid.
   */
  static isFluid(world: World, wx: number, wy: number, wz: number): boolean {
    const block = world.getBlock(wx, wy, wz);
    return block === BlockType.Water || block === BlockType.Lava;
  }
}
