import { SimplexNoise } from '../utils/SimplexNoise.js';
import { World } from './World.js';
import { BlockType } from './BlockTypes.js';
import { CONFIG, WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z, WATER_LEVEL } from '../config.js';

const CHUNK_SIZE_X = CONFIG.chunk.sizeX;
const CHUNK_SIZE_Y = CONFIG.chunk.sizeY;
const CHUNK_SIZE_Z = CONFIG.chunk.sizeZ;

/** Biome types determined by noise. */
enum Biome {
  Grassland,
  Desert,
  WaterEdge,
}

/**
 * Generates terrain into a World using Simplex noise.
 * Deterministic by seed.
 */
export class TerrainGen {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  generate(world: World): void {
    const heightNoise = new SimplexNoise(this.seed);
    const biomeNoise = new SimplexNoise(this.seed + 1);
    const caveNoise = new SimplexNoise(this.seed + 2);

    // Pre-compute heightmap and biome map
    const heightMap: number[][] = [];
    const biomeMap: Biome[][] = [];

    for (let x = 0; x < WORLD_SIZE_X; x++) {
      heightMap[x] = new Array(WORLD_SIZE_Z).fill(0);
      biomeMap[x] = new Array(WORLD_SIZE_Z).fill(Biome.Grassland);
    }

    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let z = 0; z < WORLD_SIZE_Z; z++) {
        // Height: multi-octave noise, range roughly 8-50
        const nx = x / WORLD_SIZE_X * 4;
        const nz = z / WORLD_SIZE_Z * 4;
        let h = 0;
        h += heightNoise.noise2D(nx * 0.5, nz * 0.5) * 12;
        h += heightNoise.noise2D(nx * 1.5, nz * 1.5) * 5;
        h += heightNoise.noise2D(nx * 3, nz * 3) * 2;
        const height = Math.floor(h + 22); // base height ~22, range ~3-45
        heightMap[x][z] = Math.max(3, Math.min(WORLD_SIZE_Y - 8, height));

        // Biome determination
        const b = biomeNoise.noise2D(nx * 0.3 + 100, nz * 0.3 + 100);
        if (b > 0.2) {
          biomeMap[x][z] = Biome.Desert;
        } else if (b < -0.15) {
          biomeMap[x][z] = Biome.WaterEdge;
        } else {
          biomeMap[x][z] = Biome.Grassland;
        }
      }
    }

    // Fill columns
    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let z = 0; z < WORLD_SIZE_Z; z++) {
        const height = heightMap[x][z];
        const biome = biomeMap[x][z];

        for (let y = 0; y < WORLD_SIZE_Y; y++) {
          let blockType: BlockType;

          if (y === 0 || y === 1 || y === 2) {
            // Bedrock layer
            blockType = BlockType.Bedrock;
          } else if (y < height - 3) {
            blockType = BlockType.Stone;
          } else if (y < height) {
            blockType = BlockType.Dirt;
          } else if (y === height) {
            // Surface block
            if (biome === Biome.Desert) {
              blockType = BlockType.Sand;
            } else if (biome === Biome.WaterEdge) {
              blockType = BlockType.Sand;
            } else {
              blockType = BlockType.Grass;
            }
          } else if (y <= WATER_LEVEL && y > height) {
            // Water fill
            blockType = BlockType.Water;
          } else {
            blockType = BlockType.Air;
          }

          world.setBlock(x, y, z, blockType);
        }
      }
    }

    // Carve caves using 3D noise
    this.carveCaves(world, caveNoise, heightMap);

    // Place trees
    this.placeTrees(world, heightMap, biomeMap, heightNoise);
  }

  private carveCaves(world: World, noise: SimplexNoise, heightMap: number[][]): void {
    const caveScale = 0.04;
    const caveThreshold = 0.30;

    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let z = 0; z < WORLD_SIZE_Z; z++) {
        const surfaceHeight = heightMap[x][z];
        // Cave range: from y=4 to min(surface-3, 40)
        const maxCaveY = Math.min(Math.max(5, surfaceHeight - 3), 40);
        for (let y = 4; y < maxCaveY; y++) {
          const nx = x * caveScale;
          const ny = y * caveScale;
          const nz = z * caveScale;
          const val = noise.noise3D(nx, ny, nz);
          if (val > caveThreshold) {
            const r = 1 + (val > 0.5 ? 1 : 0);
            for (let dx = -r; dx <= r; dx++) {
              for (let dy = -r; dy <= r; dy++) {
                for (let dz = -r; dz <= r; dz++) {
                  const cx = x + dx;
                  const cy = y + dy;
                  const cz = z + dz;
                  if (cx >= 0 && cx < WORLD_SIZE_X && cy >= 3 && cy < WORLD_SIZE_Y && cz >= 0 && cz < WORLD_SIZE_Z) {
                    world.setBlock(cx, cy, cz, BlockType.Air);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  private placeTrees(world: World, heightMap: number[][], biomeMap: Biome[][], noise: SimplexNoise): void {
    const treeNoise = new SimplexNoise(this.seed + 3);

    for (let x = 2; x < WORLD_SIZE_X - 2; x++) {
      for (let z = 2; z < WORLD_SIZE_Z - 2; z++) {
        if (biomeMap[x][z] !== Biome.Grassland) continue;

        const tv = treeNoise.noise2D(x * 0.08, z * 0.08);
        if (tv < 0.1) continue; // trees

        const height = heightMap[x][z];
        if (height < 8 || height > WORLD_SIZE_Y - 8) continue;

        // Trunk: 4-6 blocks tall
        const trunkHeight = 4 + Math.floor(Math.abs(treeNoise.noise2D(x * 0.3, z * 0.3)) * 3);
        for (let y = height + 1; y <= height + trunkHeight; y++) {
          world.setBlock(x, y, z, BlockType.OakLog);
        }

        // Leaves: sphere-ish shape on top
        const leafBase = height + trunkHeight;
        const leafRadius = 2;
        for (let lx = -leafRadius; lx <= leafRadius; lx++) {
          for (let lz = -leafRadius; lz <= leafRadius; lz++) {
            for (let ly = 0; ly <= 2; ly++) {
              const dist = Math.sqrt(lx * lx + lz * lz) + (ly === 0 ? 0 : Math.abs(lx) + Math.abs(lz) * 0.3);
              if (dist <= leafRadius + 0.5) {
                const wx = x + lx;
                const wy = leafBase + ly;
                const wz = z + lz;
                if (wx >= 0 && wx < WORLD_SIZE_X && wy >= 0 && wy < WORLD_SIZE_Y && wz >= 0 && wz < WORLD_SIZE_Z) {
                  const current = world.getBlock(wx, wy, wz);
                  if (current === BlockType.Air) {
                    world.setBlock(wx, wy, wz, BlockType.OakLeaves);
                  }
                }
              }
            }
          }
        }
        // Top leaf
        world.setBlock(x, leafBase + 3, z, BlockType.OakLeaves);
      }
    }
  }
}
