import * as THREE from 'three';
import { World } from './World.js';
import { BlockType, isOpaque, isTransparent } from './BlockTypes.js';
import { TextureAtlas } from './TextureAtlas.js';
import { CONFIG } from '../config.js';
import { RedstoneSystem } from '../redstone/RedstoneSystem.js';

const CHUNK_SIZE_X = CONFIG.chunk.sizeX;
const CHUNK_SIZE_Y = CONFIG.chunk.sizeY;
const CHUNK_SIZE_Z = CONFIG.chunk.sizeZ;

/** Face definitions: direction, normal, 4 corner vertices (relative), shading factor. */
interface FaceDef {
  dir: number; // 0=+x, 1=-x, 2=+y, 3=-y, 4=+z, 5=-z
  normal: [number, number, number];
  shading: number;
  /** corners: array of [dx,dy,dz] relative to block origin */
  corners: [number, number, number][];
  /** UV mapping for each corner */
  uvs: [number, number][];
}

const FACES: FaceDef[] = [
  // +X face
  { dir: 0, normal: [1, 0, 0], shading: 0.8,
    corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]],
    uvs: [[0,0],[0,1],[1,1],[1,0]] },
  // -X face
  { dir: 1, normal: [-1,0,0], shading: 0.6,
    corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]],
    uvs: [[0,0],[0,1],[1,1],[1,0]] },
  // +Y face (top)
  { dir: 2, normal: [0,1,0], shading: 1.0,
    corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]],
    uvs: [[0,0],[1,0],[1,1],[0,1]] },
  // -Y face (bottom)
  { dir: 3, normal: [0,-1,0], shading: 0.5,
    corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
    uvs: [[0,0],[1,0],[1,1],[0,1]] },
  // +Z face
  { dir: 4, normal: [0,0,1], shading: 0.7,
    corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]],
    uvs: [[0,0],[1,0],[1,1],[0,1]] },
  // -Z face
  { dir: 5, normal: [0,0,-1], shading: 0.6,
    corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]],
    uvs: [[0,0],[1,0],[1,1],[0,1]] },
];

/** Direction deltas for neighbor lookup. */
const DIR_DELTAS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

/**
 * Builds merged geometry for a chunk with face culling.
 * Produces two meshes: opaque and transparent.
 */
export class MeshBuilder {
  private world: World;
  private atlas: TextureAtlas;
  private redstoneSystem: RedstoneSystem | null = null;
  /** Map of "cx,cz" -> { opaque: THREE.Mesh, transparent: THREE.Mesh } */
  private meshes: Map<string, { opaque: THREE.Mesh | null; transparent: THREE.Mesh | null }> = new Map();

  constructor(world: World, atlas: TextureAtlas) {
    this.world = world;
    this.atlas = atlas;
  }

  /** Set the redstone system reference for querying real component state. */
  setRedstoneSystem(rs: RedstoneSystem): void {
    this.redstoneSystem = rs;
  }

  /** Build or rebuild mesh for a specific chunk. */
  buildChunk(cx: number, cz: number): void {
    const worldX = cx * CHUNK_SIZE_X;
    const worldZ = cz * CHUNK_SIZE_Z;
    const key = `${cx},${cz}`;

    const opaqueVerts: number[] = [];
    const opaqueNormals: number[] = [];
    const opaqueUvs: number[] = [];
    const opaqueColors: number[] = [];
    const opaqueIndices: number[] = [];

    const transVerts: number[] = [];
    const transNormals: number[] = [];
    const transUvs: number[] = [];
    const transColors: number[] = [];
    const transIndices: number[] = [];

    let opaqueVertCount = 0;
    let transVertCount = 0;

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
        for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
          const blockType = this.world.getBlock(worldX + lx, ly, worldZ + lz);
          if (blockType === BlockType.Air) continue;

          const isTrans = isTransparent(blockType);

          // Determine texture key based on block type and state
          const texKey = this.getTextureKeyForBlock(blockType, worldX + lx, ly, worldZ + lz);

          for (let f = 0; f < FACES.length; f++) {
            const face = FACES[f];
            const [dx, dy, dz] = DIR_DELTAS[f];
            const nx = worldX + lx + dx;
            const ny = ly + dy;
            const nz = worldZ + lz + dz;

            // Face culling
            const neighbor = this.world.getBlock(nx, ny, nz);
            if (isOpaque(neighbor)) {
              if (isOpaque(blockType)) continue;
              if (!isTransparent(blockType)) continue;
            }
            if (neighbor === BlockType.Air || (!isOpaque(neighbor) && !isOpaque(blockType))) {
              // Visible face
            } else if (isOpaque(neighbor)) {
              continue;
            }

            const vertArray = isTrans ? transVerts : opaqueVerts;
            const normalArray = isTrans ? transNormals : opaqueNormals;
            const uvArray = isTrans ? transUvs : opaqueUvs;
            const colorArray = isTrans ? transColors : opaqueColors;
            const indexArray = isTrans ? transIndices : opaqueIndices;
            const vertCount = isTrans ? transVertCount : opaqueVertCount;

            const texUV = this.atlas.getUV(texKey) ?? this.getFallbackUV(texKey);
            if (!texUV) continue;

            // Determine shading face
            const shadingFace = face.dir === 2 ? 'top' : face.dir === 3 ? 'bottom' : 'side';
            const baseShading = this.getShadingForFace(face.dir);

            // Apply dust brightness for redstone dust
            let brightness = 1.0;
            if (blockType === BlockType.RedstoneDust) {
              brightness = this.getDustBrightness(worldX + lx, ly, worldZ + lz);
            }
            // Apply lamp glow
            if (blockType === BlockType.RedstoneLamp) {
              brightness = this.getLampBrightness(worldX + lx, ly, worldZ + lz);
            }

            const finalShading = baseShading * brightness;

            for (let v = 0; v < 4; v++) {
              const [cx, cy, cz] = face.corners[v];
              vertArray.push(lx + cx, ly + cy, lz + cz);
              normalArray.push(...face.normal);
              uvArray.push(texUV.u + face.uvs[v][0] * texUV.w, texUV.v + face.uvs[v][1] * texUV.h);
              colorArray.push(finalShading, finalShading, finalShading);
            }

            // Two triangles per face
            indexArray.push(vertCount, vertCount + 1, vertCount + 2);
            indexArray.push(vertCount, vertCount + 2, vertCount + 3);

            if (isTrans) transVertCount += 4;
            else opaqueVertCount += 4;
          }
        }
      }
    }

    // Dispose old meshes
    const old = this.meshes.get(key);
    if (old?.opaque) { (old.opaque as THREE.Mesh).geometry.dispose(); }
    if (old?.transparent) { (old.transparent as THREE.Mesh).geometry.dispose(); }

    // Build opaque mesh
    let opaqueMesh: THREE.Mesh | null = null;
    if (opaqueVerts.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(opaqueVerts, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(opaqueNormals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(opaqueUvs, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(opaqueColors, 3));
      geometry.setIndex(opaqueIndices);

      const material = new THREE.MeshLambertMaterial({
        map: this.atlas.texture,
        vertexColors: true,
        side: THREE.FrontSide,
      });
      opaqueMesh = new THREE.Mesh(geometry, material);
      opaqueMesh.position.set(worldX, 0, worldZ);
    }

    // Build transparent mesh
    let transparentMesh: THREE.Mesh | null = null;
    if (transVerts.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(transVerts, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(transNormals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(transUvs, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(transColors, 3));
      geometry.setIndex(transIndices);

      const material = new THREE.MeshLambertMaterial({
        map: this.atlas.texture,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      transparentMesh = new THREE.Mesh(geometry, material);
      transparentMesh.position.set(worldX, 0, worldZ);
    }

    this.meshes.set(key, { opaque: opaqueMesh, transparent: transparentMesh });
  }

  /** Build all chunk meshes. */
  buildAll(): void {
    for (const chunk of this.world.getAllChunks()) {
      this.buildChunk(chunk.cx, chunk.cz);
    }
  }

  /** Get the scene objects for a chunk. */
  getChunkMesh(key: string): { opaque: THREE.Mesh | null; transparent: THREE.Mesh | null } | undefined {
    return this.meshes.get(key);
  }

  /** Get all opaque meshes. */
  getOpaqueMeshes(): THREE.Mesh[] {
    const result: THREE.Mesh[] = [];
    for (const { opaque } of this.meshes.values()) {
      if (opaque) result.push(opaque);
    }
    return result;
  }

  /** Get all transparent meshes. */
  getTransparentMeshes(): THREE.Mesh[] {
    const result: THREE.Mesh[] = [];
    for (const { transparent } of this.meshes.values()) {
      if (transparent) result.push(transparent);
    }
    return result;
  }

  /** Dispose all geometries and textures. */
  dispose(): void {
    for (const { opaque, transparent } of this.meshes.values()) {
      if (opaque) {
        (opaque as THREE.Mesh).geometry.dispose();
        const mat = (opaque as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose();
        } else {
          mat.dispose();
        }
      }
      if (transparent) {
        (transparent as THREE.Mesh).geometry.dispose();
        const mat = (transparent as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose();
        } else {
          mat.dispose();
        }
      }
    }
    this.meshes.clear();
    this.atlas.texture.dispose();
  }

  /** Get shading factor for a face direction. */
  private getShadingForFace(dir: number): number {
    switch (dir) {
      case 2: return 1.0;  // top
      case 3: return 0.5;  // bottom
      case 0: return 0.8;  // +x
      case 1: return 0.6;  // -x
      case 4: return 0.7;  // +z
      case 5: return 0.6;  // -z
      default: return 0.7;
    }
  }

  /** Get texture key for a block at a position, considering redstone state. */
  private getTextureKeyForBlock(blockType: number, wx: number, wy: number, wz: number): string {
    // Redstone dust: texture is always redstone_dust
    if (blockType === BlockType.RedstoneDust) {
      return 'redstone_dust';
    }

    // For all other redstone components, query the real state from RedstoneSystem
    if (this.redstoneSystem) {
      const renderKey = this.redstoneSystem.getRenderTextureKey(wx, wy, wz);
      if (renderKey) return renderKey;
    }

    // Fallback defaults (should not be reached if RedstoneSystem is set)
    if (blockType === BlockType.RedstoneTorch) return 'redstone_torch_off';
    if (blockType === BlockType.RedstoneLamp) return 'redstone_lamp_off';
    if (blockType === BlockType.Lever) return 'lever_off';
    if (blockType === BlockType.Button) return 'button_off';
    if (blockType === BlockType.RedstoneBlock) return 'redstone_block';
    if (blockType === BlockType.Repeater) return 'repeater_off_east';
    if (blockType === BlockType.Comparator) return 'comparator_off_east';
    if (blockType === BlockType.Observer) return 'observer_off_up';
    if (blockType === BlockType.Piston || blockType === BlockType.StickyPiston) return 'piston_retracted_up';
    if (blockType === BlockType.TNT) return 'tnt_unlit';
    if (blockType === BlockType.DaylightDetector) return 'daylight_detector';
    if (blockType === BlockType.NoteBlock) return 'note_block';
    if (blockType === BlockType.Hopper) return 'hopper';
    if (blockType === BlockType.RedstoneOre) return 'redstone_ore';
    if (blockType === BlockType.Target) return 'target';

    // Default: use block meta texture
    return this.getDefaultTextureKey(blockType);
  }

  /** Get dust brightness based on power level from RedstoneSystem. */
  private getDustBrightness(wx: number, wy: number, wz: number): number {
    if (this.redstoneSystem) {
      const level = this.redstoneSystem.getDustRenderLevel(wx, wy, wz);
      // Map 0-15 to 0.2-1.4 brightness
      return 0.2 + (level / 15) * 1.2;
    }
    return 0.2; // Default dim when no redstone system
  }

  /** Get lamp brightness based on power state from RedstoneSystem. */
  private getLampBrightness(wx: number, wy: number, wz: number): number {
    if (this.redstoneSystem) {
      const key = this.redstoneSystem.getRenderTextureKey(wx, wy, wz);
      if (key && key.includes('_on')) return 1.4;
      return 0.5;
    }
    return 0.5; // Default unlit
  }

  /** Get fallback UV for a directional texture key that isn't in the atlas. */
  private getFallbackUV(key: string): { u: number; v: number; w: number; h: number } | undefined {
    // For directional components, fall back to the default direction variant.
    // Atlas only contains *_east (repeater/comparator) and *_up (observer/piston).
    const eastFallback = key.replace(/_(north|south|west|up|down)$/, '_east');
    const upFallback = key.replace(/_(east|west|north|south)$/, '_up');

    if (eastFallback !== key) {
      const uv = this.atlas.getUV(eastFallback);
      if (uv) return uv;
    }
    if (upFallback !== key) {
      const uv = this.atlas.getUV(upFallback);
      if (uv) return uv;
    }
    return undefined;
  }

  /** Get default texture key for a block type. */
  private getDefaultTextureKey(type: number): string {
    const metaMap: Record<number, { texture: { top: string; bottom: string; side: string } }> = {
      0: { texture: { top: 'air', bottom: 'air', side: 'air' } },
      1: { texture: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' } },
      2: { texture: { top: 'dirt', bottom: 'dirt', side: 'dirt' } },
      3: { texture: { top: 'stone', bottom: 'stone', side: 'stone' } },
      4: { texture: { top: 'sand', bottom: 'sand', side: 'sand' } },
      5: { texture: { top: 'gravel', bottom: 'gravel', side: 'gravel' } },
      6: { texture: { top: 'log_top', bottom: 'log_top', side: 'log_side' } },
      7: { texture: { top: 'leaves', bottom: 'leaves', side: 'leaves' } },
      8: { texture: { top: 'planks', bottom: 'planks', side: 'planks' } },
      9: { texture: { top: 'water', bottom: 'water', side: 'water' } },
      10: { texture: { top: 'cobblestone', bottom: 'cobblestone', side: 'cobblestone' } },
      11: { texture: { top: 'bedrock', bottom: 'bedrock', side: 'bedrock' } },
      12: { texture: { top: 'lava', bottom: 'lava', side: 'lava' } },
    };
    const meta = metaMap[type];
    if (!meta) return 'air';
    // Use side texture as default
    return meta.texture.side;
  }
}
