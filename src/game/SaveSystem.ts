import { World } from './World.js';
import { Chunk } from './Chunk.js';
import { CONFIG } from '../config.js';

const SAVE_KEY = 'web-minecraft-save';

/**
 * Serialization result for pure logic testing.
 */
export interface SaveData {
  /** Base64-encoded chunk data. */
  chunks: string;
  /** Player position. */
  player: { x: number; y: number; z: number };
  /** Day/night time of day (0-1). */
  timeOfDay: number;
}

/**
 * Save/Load system for the Minecraft world.
 *
 * The core serialize/deserialize functions are PURE (no DOM/localStorage).
 * The save() and load() methods wrap them with localStorage access.
 */
export class SaveSystem {
  /**
   * Serialize world state to a compact string.
   * Pure function — no DOM or localStorage.
   */
  static serialize(
    world: World,
    playerPos: { x: number; y: number; z: number },
    timeOfDay: number,
  ): string {
    const chunks: Uint8Array[] = [];

    for (const chunk of world.getAllChunks()) {
      chunks.push(chunk.data);
    }

    // Build a header with metadata
    const header = {
      version: 1,
      chunksX: CONFIG.world.chunksX,
      chunksZ: CONFIG.world.chunksZ,
      sizeY: CONFIG.chunk.sizeY,
      playerX: playerPos.x,
      playerY: playerPos.y,
      playerZ: playerPos.z,
      timeOfDay,
    };

    // Combine all chunk data into a single Uint8Array
    const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Base64 encode
    const binary = Array.from(combined)
      .map((b) => String.fromCharCode(b))
      .join('');
    const chunksBase64 = btoa(binary);

    const fullData: SaveData = {
      chunks: chunksBase64,
      player: {
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z,
      },
      timeOfDay,
    };

    return JSON.stringify(fullData);
  }

  /**
   * Deserialize world state from a saved string.
   * Pure function — no DOM or localStorage.
   * Returns null if the data is invalid.
   */
  static deserialize(
    json: string,
  ): {
    chunks: Uint8Array[];
    player: { x: number; y: number; z: number };
    timeOfDay: number;
  } | null {
    try {
      const data: SaveData = JSON.parse(json);

      if (!data.chunks || !data.player) return null;

      // Decode base64
      const binary = atob(data.chunks);

      const combined = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        combined[i] = binary.charCodeAt(i);
      }

      // Split back into chunks
      const chunkSize = CONFIG.chunk.sizeX * CONFIG.chunk.sizeY * CONFIG.chunk.sizeZ;
      const numChunks = CONFIG.world.chunksX * CONFIG.world.chunksZ;
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < numChunks; i++) {
        const offset = i * chunkSize;
        chunks.push(combined.slice(offset, offset + chunkSize));
      }

      return {
        chunks,
        player: data.player,
        timeOfDay: data.timeOfDay ?? 0.25,
      };
    } catch {
      return null;
    }
  }

  /**
   * Save to localStorage.
   */
  save(
    world: World,
    playerPos: { x: number; y: number; z: number },
    timeOfDay: number,
  ): boolean {
    try {
      const json = SaveSystem.serialize(world, playerPos, timeOfDay);
      localStorage.setItem(SAVE_KEY, json);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load from localStorage.
   * Returns null if no save exists or data is invalid.
   */
  load(): {
    chunks: Uint8Array[];
    player: { x: number; y: number; z: number };
    timeOfDay: number;
  } | null {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (!json) return null;
      return SaveSystem.deserialize(json);
    } catch {
      return null;
    }
  }

  /** Remove saved data from localStorage. */
  clear(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** Check if save data exists. */
  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}
