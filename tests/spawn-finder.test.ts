import { describe, it, expect } from 'vitest';
import { BlockType } from '../src/game/BlockTypes.js';
import {
  findSurfaceY,
  findBestLandSpawnNear,
  type SpawnPoint,
} from '../src/game/SpawnFinder.js';
import { WORLD_SIZE_Y, WATER_LEVEL } from '../src/config.js';

/** Helper: build a block-accessor from an existing Uint8Array flat map. */
function makeBlockMap(data: Uint8Array, width: number, height: number, depth: number): (x: number, y: number, z: number) => BlockType {
  return (x: number, y: number, z: number): BlockType => {
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) return BlockType.Air;
    return data[x * height * depth + y * depth + z] as BlockType;
  };
}

function setBlock(data: Uint8Array, width: number, height: number, depth: number, x: number, y: number, z: number, type: BlockType): void {
  if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth) return;
  data[x * height * depth + y * depth + z] = type;
}

describe('SpawnFinder', () => {
  describe('findSurfaceY', () => {
    it('SF-01: finds the highest non-air, non-water block', () => {
      const size = 16;
      const data = new Uint8Array(size * WORLD_SIZE_Y * size);
      // Place stone at y=35
      setBlock(data, size, WORLD_SIZE_Y, size, 5, 35, 5, BlockType.Stone);
      // Fill below with water
      for (let y = 0; y < 35; y++) {
        setBlock(data, size, WORLD_SIZE_Y, size, 5, y, 5, BlockType.Water);
      }
      const getBlock = makeBlockMap(data, size, WORLD_SIZE_Y, size);
      expect(findSurfaceY(getBlock, 5, 5)).toBe(35);
    });

    it('SF-02: returns -1 when no land exists (all water + air)', () => {
      const size = 16;
      const data = new Uint8Array(size * WORLD_SIZE_Y * size);
      // Only water, no land
      for (let y = 0; y < WATER_LEVEL; y++) {
        setBlock(data, size, WORLD_SIZE_Y, size, 5, y, 5, BlockType.Water);
      }
      const getBlock = makeBlockMap(data, size, WORLD_SIZE_Y, size);
      expect(findSurfaceY(getBlock, 5, 5)).toBe(-1);
    });

    it('SF-03: returns highest block when multiple land blocks in column', () => {
      const size = 16;
      const data = new Uint8Array(size * WORLD_SIZE_Y * size);
      setBlock(data, size, WORLD_SIZE_Y, size, 3, 10, 3, BlockType.Stone);
      setBlock(data, size, WORLD_SIZE_Y, size, 3, 25, 3, BlockType.Grass);
      setBlock(data, size, WORLD_SIZE_Y, size, 3, 40, 3, BlockType.Dirt);
      const getBlock = makeBlockMap(data, size, WORLD_SIZE_Y, size);
      expect(findSurfaceY(getBlock, 3, 3)).toBe(40);
    });

    it('SF-04: out-of-bounds returns -1', () => {
      const size = 16;
      const data = new Uint8Array(size * WORLD_SIZE_Y * size);
      const getBlock = makeBlockMap(data, size, WORLD_SIZE_Y, size);
      expect(findSurfaceY(getBlock, -1, 0)).toBe(-1);
      expect(findSurfaceY(getBlock, 0, -1)).toBe(-1);
      expect(findSurfaceY(getBlock, size, 0)).toBe(-1);
    });
  });

  describe('findBestLandSpawnNear', () => {
    const worldSize = 128;
    const center = 64;

    /** Build a world with bedrock (y=0..2), water (y=3..29), and an optional land pillar. */
    function buildWorld(
      landX: number | null,
      landZ: number | null,
      landY: number,
    ): (x: number, y: number, z: number) => BlockType {
      const data = new Uint8Array(worldSize * WORLD_SIZE_Y * worldSize);
      // Bedrock
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Bedrock);
          }
        }
      }
      // Water
      for (let y = 3; y < WATER_LEVEL; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Water);
          }
        }
      }
      // Land pillar
      if (landX !== null && landZ !== null) {
        for (let y = WATER_LEVEL; y <= landY; y++) {
          setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, landX, y, landZ, BlockType.Grass);
        }
      }
      return makeBlockMap(data, worldSize, WORLD_SIZE_Y, worldSize);
    }

    it('SF-05: picks highest land point in scan region', () => {
      // Build world with two land points at different heights
      const data = new Uint8Array(worldSize * WORLD_SIZE_Y * worldSize);
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Bedrock);
          }
        }
      }
      for (let y = 3; y < WATER_LEVEL; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Water);
          }
        }
      }
      // Land at (60, 60) height 32
      for (let y = WATER_LEVEL; y <= 32; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 60, y, 60, BlockType.Grass);
      }
      // Land at (68, 68) height 36
      for (let y = WATER_LEVEL; y <= 36; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 68, y, 68, BlockType.Grass);
      }
      const getBlock2 = makeBlockMap(data, worldSize, WORLD_SIZE_Y, worldSize);

      const result = findBestLandSpawnNear(getBlock2, center, center, 16, 2, WATER_LEVEL);
      expect(result.spawnX).toBe(68);
      expect(result.spawnZ).toBe(68);
    });

    it('SF-06: falls back to center when no land found', () => {
      const getBlock = buildWorld(null, null, 0);
      const result = findBestLandSpawnNear(getBlock, center, center, 16, 2, WATER_LEVEL);
      expect(result.spawnX).toBe(center);
      expect(result.spawnZ).toBe(center);
    });

    it('SF-07: respects minimum terrain height threshold', () => {
      const data = new Uint8Array(worldSize * WORLD_SIZE_Y * worldSize);
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Bedrock);
          }
        }
      }
      for (let y = 3; y < WATER_LEVEL; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Water);
          }
        }
      }
      // Land at (56, 56) height 28 (below threshold)
      for (let y = WATER_LEVEL - 2; y <= 28; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 56, y, 56, BlockType.Grass);
      }
      // Land at (70, 70) height 35 (above threshold)
      for (let y = WATER_LEVEL; y <= 35; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 70, y, 70, BlockType.Grass);
      }
      const getBlock = makeBlockMap(data, worldSize, WORLD_SIZE_Y, worldSize);

      const result = findBestLandSpawnNear(getBlock, center, center, 16, 2, WATER_LEVEL);
      // Should pick (70, 70) since (56, 56) is below water level threshold
      expect(result.spawnX).toBe(70);
      expect(result.spawnZ).toBe(70);
    });

    it('SF-08: prefers spots closer to center when heights are equal', () => {
      const data = new Uint8Array(worldSize * WORLD_SIZE_Y * worldSize);
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Bedrock);
          }
        }
      }
      for (let y = 3; y < WATER_LEVEL; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Water);
          }
        }
      }
      // Land at (56, 56) height 35
      for (let y = WATER_LEVEL; y <= 35; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 56, y, 56, BlockType.Grass);
      }
      // Land at (80, 80) height 35
      for (let y = WATER_LEVEL; y <= 35; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 80, y, 80, BlockType.Grass);
      }
      const getBlock = makeBlockMap(data, worldSize, WORLD_SIZE_Y, worldSize);

      // With step=2, (56, 56) is scanned before (80, 80)
      // Since both are equal height and we use strict >, first found wins
      const result = findBestLandSpawnNear(getBlock, center, center, 16, 2, WATER_LEVEL);
      expect(result.spawnX).toBe(56);
      expect(result.spawnZ).toBe(56);
    });

    it('SF-09: handles step=1 for finer granularity', () => {
      const data = new Uint8Array(worldSize * WORLD_SIZE_Y * worldSize);
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Bedrock);
          }
        }
      }
      for (let y = 3; y < WATER_LEVEL; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Water);
          }
        }
      }
      for (let y = WATER_LEVEL; y <= 35; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 63, y, 63, BlockType.Grass);
      }
      const getBlock = makeBlockMap(data, worldSize, WORLD_SIZE_Y, worldSize);

      const result = findBestLandSpawnNear(getBlock, center, center, 16, 1, WATER_LEVEL);
      expect(result.spawnX).toBe(63);
      expect(result.spawnZ).toBe(63);
    });

    it('SF-10: skips out-of-bounds coordinates', () => {
      const data = new Uint8Array(worldSize * WORLD_SIZE_Y * worldSize);
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Bedrock);
          }
        }
      }
      for (let y = 3; y < WATER_LEVEL; y++) {
        for (let x = 0; x < worldSize; x++) {
          for (let z = 0; z < worldSize; z++) {
            setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, x, y, z, BlockType.Water);
          }
        }
      }
      for (let y = WATER_LEVEL; y <= 35; y++) {
        setBlock(data, worldSize, WORLD_SIZE_Y, worldSize, 0, y, 0, BlockType.Grass);
      }
      const getBlock = makeBlockMap(data, worldSize, WORLD_SIZE_Y, worldSize);

      // Scan around center (64,64) with halfSize=16 → range [48,80], (0,0) is outside
      const result = findBestLandSpawnNear(getBlock, center, center, 16, 2, WATER_LEVEL);
      // Falls back to center since no land in scan region
      expect(result.spawnX).toBe(center);
      expect(result.spawnZ).toBe(center);
    });

    it('SF-11: returns SpawnPoint interface shape', () => {
      const result: SpawnPoint = { spawnX: 10, spawnZ: 20 };
      expect(typeof result.spawnX).toBe('number');
      expect(typeof result.spawnZ).toBe('number');
    });
  });
});
