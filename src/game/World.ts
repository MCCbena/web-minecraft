import { Chunk } from './Chunk.js';
import { BlockType } from './BlockTypes.js';
import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z } from '../config.js';

const CHUNK_SIZE_X = CONFIG.chunk.sizeX;
const CHUNK_SIZE_Y = CONFIG.chunk.sizeY;
const CHUNK_SIZE_Z = CONFIG.chunk.sizeZ;

/**
 * World manages chunks and provides block get/set with world coordinates.
 */
export class World {
  /** Map of "cx,cz" -> Chunk. */
  private chunks: Map<string, Chunk> = new Map();

  /** Callback fired when a block changes (for mesh rebuilding). */
  public onBlockChange: ((wx: number, wy: number, wz: number) => void) | null = null;

  /** Callback fired when a chunk needs full remesh (adjacent chunk boundary change). */
  public onChunkDirty: ((cx: number, cz: number) => void) | null = null;

  /** Generate all chunks with empty data. */
  generateEmpty(): void {
    for (let cx = 0; cx < CONFIG.world.chunksX; cx++) {
      for (let cz = 0; cz < CONFIG.world.chunksZ; cz++) {
        this.setChunk(cx, cz, new Chunk(cx, cz));
      }
    }
  }

  private getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  private setChunk(cx: number, cz: number, chunk: Chunk): void {
    this.chunks.set(this.getChunkKey(cx, cz), chunk);
  }

  private getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(cx, cz));
  }

  /** Get block at world coordinates. Returns Air for out-of-bounds. */
  getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wx < 0 || wx >= WORLD_SIZE_X || wy < 0 || wy >= WORLD_SIZE_Y || wz < 0 || wz >= WORLD_SIZE_Z) {
      return BlockType.Air;
    }
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return BlockType.Air;
    const lx = wx - cx * CHUNK_SIZE_X;
    const lz = wz - cz * CHUNK_SIZE_Z;
    return chunk.getLocal(lx, wy, lz);
  }

  /** Set block at world coordinates. Returns false if failed (unbreakable / out of bounds). */
  setBlock(wx: number, wy: number, wz: number, type: BlockType): boolean {
    if (wx < 0 || wx >= WORLD_SIZE_X || wy < 0 || wy >= WORLD_SIZE_Y || wz < 0 || wz >= WORLD_SIZE_Z) {
      return false;
    }
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;
    const lx = wx - cx * CHUNK_SIZE_X;
    const lz = wz - cz * CHUNK_SIZE_Z;
    const success = chunk.setLocal(lx, wy, lz, type);
    if (!success) return false;

    // Notify block change
    this.onBlockChange?.(wx, wy, wz);

    // If on chunk boundary, mark adjacent chunks dirty too
    if (lx === 0) {
      const adjCx = cx - 1;
      if (adjCx >= 0) {
        const adj = this.getChunk(adjCx, cz);
        if (adj) {
          adj.dirty = true;
          this.onChunkDirty?.(adjCx, cz);
        }
      }
    }
    if (lx === CHUNK_SIZE_X - 1) {
      const adjCx = cx + 1;
      if (adjCx < CONFIG.world.chunksX) {
        const adj = this.getChunk(adjCx, cz);
        if (adj) {
          adj.dirty = true;
          this.onChunkDirty?.(adjCx, cz);
        }
      }
    }
    if (lz === 0) {
      const adjCz = cz - 1;
      if (adjCz >= 0) {
        const adj = this.getChunk(cx, adjCz);
        if (adj) {
          adj.dirty = true;
          this.onChunkDirty?.(cx, adjCz);
        }
      }
    }
    if (lz === CHUNK_SIZE_Z - 1) {
      const adjCz = cz + 1;
      if (adjCz < CONFIG.world.chunksZ) {
        const adj = this.getChunk(cx, adjCz);
        if (adj) {
          adj.dirty = true;
          this.onChunkDirty?.(cx, adjCz);
        }
      }
    }

    // Mark this chunk dirty
    chunk.dirty = true;
    this.onChunkDirty?.(cx, cz);

    return true;
  }

  /** Get the chunk at world coordinates. */
  getChunkAt(wx: number, wz: number): Chunk | undefined {
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    return this.getChunk(cx, cz);
  }

  /** Get all chunks. */
  getAllChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  /** Get world size. */
  getWidth(): number { return WORLD_SIZE_X; }
  getHeight(): number { return WORLD_SIZE_Y; }
  getDepth(): number { return WORLD_SIZE_Z; }
}
