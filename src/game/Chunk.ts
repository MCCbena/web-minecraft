import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z } from '../config.js';
import { BlockType, isBreakable } from './BlockTypes.js';

const CHUNK_SIZE_X = CONFIG.chunk.sizeX;
const CHUNK_SIZE_Y = CONFIG.chunk.sizeY;
const CHUNK_SIZE_Z = CONFIG.chunk.sizeZ;
const CHUNK_BLOCK_COUNT = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z;

export class Chunk {
  /** Block data: Uint8Array of block IDs, indexed by local coords. */
  public data: Uint8Array;
  /** Whether this chunk's mesh needs rebuilding. */
  public dirty: boolean = true;
  /** Chunk world-space X index. */
  public cx: number;
  /** Chunk world-space Z index. */
  public cz: number;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.data = new Uint8Array(CHUNK_BLOCK_COUNT);
  }

  /** Convert local (x,y,z) to flat index. */
  localIndex(x: number, y: number, z: number): number {
    return (y * CHUNK_SIZE_Z + z) * CHUNK_SIZE_X + x;
  }

  /** Get block at local coordinates. */
  getLocal(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
      return BlockType.Air;
    }
    return this.data[this.localIndex(x, y, z)];
  }

  /** Set block at local coordinates. Returns false if block is unbreakable/invalid. */
  setLocal(x: number, y: number, z: number, type: BlockType): boolean {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
      return false;
    }
    const existing = this.data[this.localIndex(x, y, z)];
    // Bedrock is unbreakable
    if (existing === BlockType.Bedrock && type !== BlockType.Bedrock) {
      return false;
    }
    this.data[this.localIndex(x, y, z)] = type;
    this.dirty = true;
    return true;
  }

  /** Check if local coords are within chunk bounds. */
  isInside(x: number, y: number, z: number): boolean {
    return x >= 0 && x < CHUNK_SIZE_X && y >= 0 && y < CHUNK_SIZE_Y && z >= 0 && z < CHUNK_SIZE_Z;
  }
}
