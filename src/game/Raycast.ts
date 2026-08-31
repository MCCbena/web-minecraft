import * as THREE from 'three';
import { World } from './World.js';
import { BlockType } from './BlockTypes.js';
import { CONFIG } from '../config.js';

const REACH = CONFIG.physics.reach;

/** Direction deltas for DDA. */
const DIR_DELTAS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

export interface RaycastResult {
  hit: boolean;
  blockPos: { x: number; y: number; z: number };
  prevPos: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
}

/**
 * DDA voxel raycast from camera position in a direction.
 * Returns the first solid block hit, the previous position (for placement), and the face normal.
 */
export function raycast(
  world: World,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDist: number = REACH,
): RaycastResult {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = direction.x > 0 ? 1 : direction.x < 0 ? -1 : 0;
  const stepY = direction.y > 0 ? 1 : direction.y < 0 ? -1 : 0;
  const stepZ = direction.z > 0 ? 1 : direction.z < 0 ? -1 : 0;

  // TMax: distance to next grid boundary
  let tMaxX: number;
  let tMaxY: number;
  let tMaxZ: number;
  let tDeltaX: number;
  let tDeltaY: number;
  let tDeltaZ: number;

  const eps = 0.0001;

  if (direction.x !== 0) {
    tMaxX = direction.x > 0
      ? (Math.floor(origin.x) + 1 - origin.x) / direction.x
      : (origin.x - Math.floor(origin.x)) / (-direction.x);
    tDeltaX = Math.abs(1 / direction.x);
  } else {
    tMaxX = Infinity;
    tDeltaX = Infinity;
  }

  if (direction.y !== 0) {
    tMaxY = direction.y > 0
      ? (Math.floor(origin.y) + 1 - origin.y) / direction.y
      : (origin.y - Math.floor(origin.y)) / (-direction.y);
    tDeltaY = Math.abs(1 / direction.y);
  } else {
    tMaxY = Infinity;
    tDeltaY = Infinity;
  }

  if (direction.z !== 0) {
    tMaxZ = direction.z > 0
      ? (Math.floor(origin.z) + 1 - origin.z) / direction.z
      : (origin.z - Math.floor(origin.z)) / (-direction.z);
    tDeltaZ = Math.abs(1 / direction.z);
  } else {
    tMaxZ = Infinity;
    tDeltaZ = Infinity;
  }

  let prevX = x, prevY = y, prevZ = z;
  let dist = 0;

  while (dist <= maxDist) {
    const block = world.getBlock(x, y, z);
    if (block !== BlockType.Air && block !== BlockType.Water && block !== BlockType.Lava) {
      // Determine normal from which face we entered
      let normalX = 0, normalY = 0, normalZ = 0;
      if (dist === tMaxX) { normalX = -stepX; }
      else if (dist === tMaxY) { normalY = -stepY; }
      else if (dist === tMaxZ) { normalZ = -stepZ; }

      return {
        hit: true,
        blockPos: { x, y, z },
        prevPos: { x: prevX, y: prevY, z: prevZ },
        normal: { x: normalX, y: normalY, z: normalZ },
      };
    }

    prevX = x;
    prevY = y;
    prevZ = z;

    // Advance to next grid boundary
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
      } else {
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
      }
    }
  }

  return { hit: false, blockPos: { x: 0, y: 0, z: 0 }, prevPos: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 } };
}
