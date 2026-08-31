import { BlockType } from './BlockTypes.js';
import { WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z } from '../config.js';

/**
 * Result of finding the best land spawn point.
 */
export interface SpawnPoint {
  spawnX: number;
  spawnZ: number;
}

/**
 * Find the surface Y at a given X, Z by scanning from top down.
 * Returns -1 if no non-air, non-water block is found.
 */
export function findSurfaceY(worldBlocks: (x: number, y: number, z: number) => BlockType, x: number, z: number): number {
  for (let y = WORLD_SIZE_Y - 1; y >= 0; y--) {
    const block = worldBlocks(x, y, z);
    if (block !== BlockType.Air && block !== BlockType.Water) {
      return y;
    }
  }
  return -1;
}

/**
 * Find the best land spawn point near a given center.
 * Scans a square region in steps, picks the spot with the highest terrain
 * that is at or above the given minimumY (water level).
 * Falls back to the center if no land is found.
 *
 * @param getBlock - function that returns the block type at a world position
 * @param centerX - center X of the scan region
 * @param centerZ - center Z of the scan region
 * @param halfSize - half the side length of the square scan region
 * @param step - step size for the scan (must be > 0)
 * @param minTerrainY - minimum terrain height to consider as "land" (e.g. water level)
 * @returns the best spawn point { spawnX, spawnZ }
 */
export function findBestLandSpawnNear(
  getBlock: (x: number, y: number, z: number) => BlockType,
  centerX: number,
  centerZ: number,
  halfSize: number,
  step: number,
  minTerrainY: number,
): SpawnPoint {
  if (step <= 0) throw new Error(`findBestLandSpawnNear: step must be > 0, got ${step}`);
  let bestX = centerX;
  let bestZ = centerZ;
  let bestY = -1;

  for (let x = centerX - halfSize; x <= centerX + halfSize; x += step) {
    for (let z = centerZ - halfSize; z <= centerZ + halfSize; z += step) {
      if (x < 0 || x >= WORLD_SIZE_X || z < 0 || z >= WORLD_SIZE_Z) continue;
      const surfaceY = findSurfaceY(getBlock, x, z);
      if (surfaceY >= minTerrainY && surfaceY > bestY) {
        bestX = x;
        bestZ = z;
        bestY = surfaceY;
      }
    }
  }

  return { spawnX: bestX, spawnZ: bestZ };
}
