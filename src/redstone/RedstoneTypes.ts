/**
 * Redstone system type definitions.
 */

/** Six cardinal directions: +X, -X, +Y, -Y, +Z, -Z */
export const DIR_DELTAS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

/** Opposite direction index */
export function oppositeDir(d: number): number {
  return d % 2 === 0 ? d + 1 : d - 1;
}

/** Get the world coordinate of a neighbor */
export function neighborPos(x: number, y: number, z: number, dir: number): [number, number, number] {
  const [dx, dy, dz] = DIR_DELTAS[dir];
  return [x + dx, y + dy, z + dz];
}

/** Position key for maps */
export function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/** Parse a position key back to coordinates */
export function parsePosKey(key: string): [number, number, number] {
  const parts = key.split(',').map(Number);
  return [parts[0], parts[1], parts[2]];
}

/**
 * Redstone component types.
 */
export enum RedstoneComponentType {
  RedstoneDust = 0,
  RedstoneTorch,
  RedstoneLamp,
  Lever,
  Button,
  RedstoneBlock,
  RedstoneOre,
  Repeater,
  Comparator,
  Observer,
  Piston,
  StickyPiston,
  TNT,
  DaylightDetector,
  NoteBlock,
  Hopper,
  Target,
}

/** All redstone component block types */
export const REDSTONE_COMPONENT_TYPES: number[] = [
  13, 14, 15, 16, 17, 18, 28, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29,
];

/** Check if a block type is a redstone component */
export function isRedstoneComponent(type: number): boolean {
  return REDSTONE_COMPONENT_TYPES.includes(type);
}

/** Get the component type for a block type */
export function getComponentType(type: number): RedstoneComponentType | null {
  const map: Record<number, RedstoneComponentType> = {
    13: RedstoneComponentType.RedstoneDust,
    14: RedstoneComponentType.RedstoneTorch,
    15: RedstoneComponentType.RedstoneLamp,
    16: RedstoneComponentType.Lever,
    17: RedstoneComponentType.Button,
    18: RedstoneComponentType.RedstoneBlock,
    28: RedstoneComponentType.RedstoneOre,
    19: RedstoneComponentType.Repeater,
    20: RedstoneComponentType.Comparator,
    21: RedstoneComponentType.Observer,
    22: RedstoneComponentType.Piston,
    23: RedstoneComponentType.StickyPiston,
    24: RedstoneComponentType.TNT,
    25: RedstoneComponentType.DaylightDetector,
    26: RedstoneComponentType.NoteBlock,
    27: RedstoneComponentType.Hopper,
    29: RedstoneComponentType.Target,
  };
  return map[type] ?? null;
}

/**
 * State stored per redstone component.
 */
export interface RedstoneState {
  facing: number;        // 0-5 direction (output for repeater/comparator/observer/piston)
  delay: number;         // Repeater delay 1-4
  mode: number;          // Comparator mode: 0=compare, 1=subtract
  on: boolean;           // Torch/lamp/lever/lit flag
  pressedTicks: number;  // Button press countdown
  fuse: number;          // TNT fuse countdown
  extended: boolean;     // Piston extended state
  lockedLevel: number;   // Comparator-locked repeater level
  lastObserved: string;  // Observer last-observed state key
  cooldown: number;      // Observer cooldown ticks
  note: number;          // Note block note 0-14
  inputLevel: number;    // Repeater input level
  inputChanged: boolean; // Repeater input changed flag
  prevOutput: number;    // Repeater/comparator previous output
  powered: boolean;      // Whether the component is currently powered
  /** Previous lit/on state for change detection */
  prevLit: boolean;
}

/**
 * Store for all redstone component states.
 */
export class RedstoneStateStore {
  private states: Map<string, RedstoneState> = new Map();

  get(x: number, y: number, z: number): RedstoneState | undefined {
    return this.states.get(posKey(x, y, z));
  }

  set(x: number, y: number, z: number, state: RedstoneState): void {
    this.states.set(posKey(x, y, z), state);
  }

  has(x: number, y: number, z: number): boolean {
    return this.states.has(posKey(x, y, z));
  }

  remove(x: number, y: number, z: number): boolean {
    return this.states.delete(posKey(x, y, z));
  }

  clear(): void {
    this.states.clear();
  }

  getAll(): Map<string, RedstoneState> {
    return this.states;
  }

  /** Get all component positions */
  getPositions(): [number, number, number][] {
    const result: [number, number, number][] = [];
    for (const key of this.states.keys()) {
      result.push(parsePosKey(key));
    }
    return result;
  }
}

/**
 * Context passed to component tick methods.
 */
export interface RedstoneCtx {
  world: { getBlock(x: number, y: number, z: number): number; setBlock(x: number, y: number, z: number, type: number): boolean };
  stateStore: RedstoneStateStore;
  power: {
    isPowered(x: number, y: number, z: number): boolean;
    isStronglyPowered(x: number, y: number, z: number): boolean;
    dustLevel(x: number, y: number, z: number): number;
    hasPoweredDustNeighbor(x: number, y: number, z: number): boolean;
    hasPoweredDustOnTop(x: number, y: number, z: number): boolean;
  };
  timeOfDay: number;
  tickCount: number;
  scheduleRemesh: (x: number, y: number, z: number) => void;
  playSound: (name: string) => void;
}
