/**
 * Global configuration constants.
 */
export const CONFIG = {
  chunk: {
    sizeX: 16,
    sizeY: 64,
    sizeZ: 16,
  },
  world: {
    chunksX: 8,
    chunksZ: 8,
  },
  physics: {
    gravity: 32,
    jumpSpeed: 8,
    walkSpeed: 4.3,
    flySpeed: 10,
    reach: 6,
  },
  dayNight: {
    dayLengthSec: 600,
  },
  redstone: {
    tps: 20,
    maxReach: 15,
    buttonHoldTicks: 200,
    tntFuseTicks: 36,
    tntRadius: 5,
  },
  seed: 1337,
} as const;

// Derived constants
export const WORLD_SIZE_X = CONFIG.chunk.sizeX * CONFIG.world.chunksX; // 128
export const WORLD_SIZE_Z = CONFIG.chunk.sizeZ * CONFIG.world.chunksZ; // 128
export const WORLD_SIZE_Y = CONFIG.chunk.sizeY; // 64
export const WATER_LEVEL = 30;
