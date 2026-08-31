import { describe, it, expect } from 'vitest';
import { RedstoneSystem } from '../src/redstone/RedstoneSystem.js';
import { RedstoneComponentType } from '../src/redstone/RedstoneTypes.js';

/**
 * Helper: create a mock world with a simple flat terrain.
 */
function createMockWorld(): {
  getBlock: (x: number, y: number, z: number) => number;
  setBlock: (x: number, y: number, z: number, type: number) => boolean;
} {
  const blocks = new Map<string, number>();

  for (let x = -20; x <= 40; x++) {
    for (let z = -20; z <= 40; z++) {
      blocks.set(`${x},10,${z}`, 3); // Stone
      blocks.set(`${x},9,${z}`, 3); // Stone
    }
  }

  return {
    getBlock(x, y, z) {
      return blocks.get(`${x},${y},${z}`) ?? 0;
    },
    setBlock(x, y, z, type) {
      blocks.set(`${x},${y},${z}`, type);
      return true;
    },
  };
}

function createSystem(): {
  system: RedstoneSystem;
  world: ReturnType<typeof createMockWorld>;
} {
  const world = createMockWorld();
  const system = new RedstoneSystem(
    world,
    () => {},
    () => {},
  );
  return { system, world };
}

function defaultState(): any {
  return {
    facing: 0, delay: 1, mode: 0, on: false, pressedTicks: 0,
    fuse: 0, extended: false, lockedLevel: -1, lastObserved: '',
    cooldown: 0, note: 0, inputLevel: 0, inputChanged: false,
    prevOutput: 0, powered: false, prevLit: false, inverted: false, _delayCounter: 0,
  };
}

describe('Redstone Components - Core Logic', () => {
  describe('Lever/Button (C-14)', () => {
    it('ON/押下で15、ボタンは200tick後に解放', () => {
      const { system, world } = createSystem();

      // Lever
      world.setBlock(5, 10, 5, 16); // Lever
      system.registerComponent(5, 10, 5, 16);

      const leverState = system.getComponentState(5, 10, 5);

      // Toggle lever on
      system.interact(5, 10, 5, false);
      expect(leverState.on).toBe(true);

      // Toggle lever off
      system.interact(5, 10, 5, false);
      expect(leverState.on).toBe(false);

      // Button
      world.setBlock(6, 10, 5, 17); // Button
      system.registerComponent(6, 10, 5, 17);

      const buttonState = system.getComponentState(6, 10, 5);

      // Press button
      system.interact(6, 10, 5, false);
      expect(buttonState.pressedTicks).toBe(200);

      // Advance time
      for (let i = 0; i < 200; i++) {
        system.tick();
      }

      expect(buttonState.pressedTicks).toBe(0); // Released
    });
  });

  describe('Daylight Detector (C-12)', () => {
    it('昼→on、夜→off、逆転モードで反転', () => {
      const { system, world } = createSystem();

      world.setBlock(5, 10, 5, 25); // DaylightDetector
      system.registerComponent(5, 10, 5, 25);

      const state = system.getComponentState(5, 10, 5);

      // Noon (timeOfDay = 0.25)
      system.setTimeOfDay(0.25);
      system.tick();

      expect(state.on).toBe(true); // Should be on at noon

      // Midnight (timeOfDay = 0.75)
      system.setTimeOfDay(0.75);
      system.tick();

      expect(state.on).toBe(false); // Should be off at midnight

      // Toggle inverted
      state.inverted = true;
      system.tick();

      expect(state.on).toBe(true); // Inverted: midnight → on
    });
  });

  describe('Repeater State Management', () => {
    it('リピータのfacing/delay状態が正しく管理される', () => {
      const { system, world } = createSystem();

      world.setBlock(5, 10, 5, 19); // Repeater
      system.registerComponent(5, 10, 5, 19);

      const state = system.getComponentState(5, 10, 5);

      // Default facing is 0
      expect(state.facing).toBe(0);

      // Interact cycles facing
      system.interact(5, 10, 5, false);
      expect(state.facing).toBe(1);

      system.interact(5, 10, 5, false);
      expect(state.facing).toBe(2);

      // Shift+interact cycles delay: (current % 4) + 1
      // Initial delay is 1, so (1 % 4) + 1 = 2
      system.interact(5, 10, 5, true);
      expect(state.delay).toBe(2);
    });
  });

  describe('Comparator State Management', () => {
    it('コンパレータのmodeが正しく切替わる', () => {
      const { system, world } = createSystem();

      world.setBlock(5, 10, 5, 20); // Comparator
      system.registerComponent(5, 10, 5, 20);

      const state = system.getComponentState(5, 10, 5);

      // Default mode is 0 (compare)
      expect(state.mode).toBe(0);

      // Shift+interact toggles mode
      system.interact(5, 10, 5, true);
      expect(state.mode).toBe(1); // subtract

      system.interact(5, 10, 5, true);
      expect(state.mode).toBe(0); // compare
    });
  });

  describe('Component Registration', () => {
    it('レッドストーンコンポーネントが正しく登録・解除される', () => {
      const { system, world } = createSystem();

      // Register
      world.setBlock(5, 10, 5, 16); // Lever
      system.registerComponent(5, 10, 5, 16);

      expect(system.hasComponent(5, 10, 5)).toBe(true);
      expect(system.getComponentState(5, 10, 5)).not.toBeNull();

      // Unregister
      system.unregisterComponent(5, 10, 5);
      expect(system.hasComponent(5, 10, 5)).toBe(false);
      expect(system.getComponentState(5, 10, 5)).toBeNull();
    });
  });
});

/**
 * Real-position tests — these MUST pass with the position fix.
 * They would FAIL if components still used (0,0,0) internally.
 */
describe('Redstone Components - Real Position Tests', () => {
  describe('Lamp at real position (C-15)', () => {
    it('L-01: ランプが電力を受けると点灯、受けないと消灯 — 実座標 (10,20,10)', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Place a RedstoneBlock adjacent to power the lamp
      world.setBlock(px, py, pz, 15); // RedstoneLamp
      world.setBlock(px + 1, py, pz, 18); // RedstoneBlock (adjacent source)
      system.registerComponent(px, py, pz, 15);
      system.registerComponent(px + 1, py, pz, 18);

      // Run tick to recompute power and update lamp
      system.tick();

      const lampState = system.getComponentState(px, py, pz);
      expect(lampState.on).toBe(true);
      expect(lampState.prevLit).toBe(true);

      // Remove the power source
      world.setBlock(px + 1, py, pz, 0); // Air
      system.unregisterComponent(px + 1, py, pz);
      system.tick();

      // Lamp should turn off
      const lampState2 = system.getComponentState(px, py, pz);
      expect(lampState2.on).toBe(false);
    });

    it('L-02: 実座標 (50,30,50) のランプ — RedstoneBlock 隣接で点灯', () => {
      const { system, world } = createSystem();
      const px = 50, py = 30, pz = 50;

      world.setBlock(px, py, pz, 15); // RedstoneLamp
      world.setBlock(px - 1, py, pz, 18); // RedstoneBlock
      system.registerComponent(px, py, pz, 15);
      system.registerComponent(px - 1, py, pz, 18);

      system.tick();

      const lampState = system.getComponentState(px, py, pz);
      expect(lampState.on).toBe(true);
    });
  });

  describe('Torch NOT gate at real position', () => {
    it('T-01: 火把NOTゲート — 実座標 (10,20,10) で正しく反転', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Place a block with a torch on top
      world.setBlock(px, py, pz, 3); // Stone (support)
      world.setBlock(px, py + 1, pz, 14); // RedstoneTorch
      system.registerComponent(px, py + 1, pz, 14);

      system.tick();

      const torchState = system.getComponentState(px, py + 1, pz);
      // Support block is unpowered, so torch should be ON
      expect(torchState.on).toBe(true);

      // Now power the support block with a RedstoneBlock adjacent
      world.setBlock(px - 1, py, pz, 18); // RedstoneBlock (powers the stone)
      system.registerComponent(px - 1, py, pz, 18);
      system.tick();

      // Support is now powered, torch should be OFF
      const torchState2 = system.getComponentState(px, py + 1, pz);
      expect(torchState2.on).toBe(false);
    });
  });

  describe('Repeater at real position', () => {
    it('R-01: リピータが実座標 (10,20,10) で入力を検知して出力する', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Place repeater facing +X (facing=0 means output toward +X)
      // Input comes from -X direction (opposite of facing)
      world.setBlock(px, py, pz, 19); // Repeater
      world.setBlock(px - 1, py, pz, 18); // RedstoneBlock (input source)
      system.registerComponent(px, py, pz, 19);
      system.registerComponent(px - 1, py, pz, 18);

      // Set facing to +X (0)
      const state = system.getComponentState(px, py, pz);
      state.facing = 0;

      system.tick();

      // After delay (1 tick), output should be on
      expect(state.on).toBe(true);
    });

    it('R-02: リピータの入力面が実座標で正しくチェックされる', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Repeater facing +Z (4), so input from -Z (5)
      world.setBlock(px, py, pz, 19); // Repeater
      world.setBlock(px, py, pz - 1, 18); // RedstoneBlock at -Z (input)
      system.registerComponent(px, py, pz, 19);
      system.registerComponent(px, py, pz - 1, 18);

      const state = system.getComponentState(px, py, pz);
      state.facing = 4; // Output toward +Z

      system.tick();

      expect(state.on).toBe(true);
    });
  });

  describe('Piston at real position', () => {
    it('P-01: ピストンが実座標 (10,20,10) で前方のブロックを押す', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Place piston facing +X (0), with a block in front (2 blocks away)
      world.setBlock(px, py, pz, 22); // Piston
      world.setBlock(px + 1, py, pz, 0); // Air (piston head space)
      world.setBlock(px + 2, py, pz, 3); // Stone block to push
      world.setBlock(px + 3, py, pz, 0); // Air behind push target
      system.registerComponent(px, py, pz, 22);

      const state = system.getComponentState(px, py, pz);
      state.facing = 0; // +X

      // Power the piston with a RedstoneBlock behind it
      world.setBlock(px - 1, py, pz, 18); // RedstoneBlock (powers piston from back)
      system.registerComponent(px - 1, py, pz, 18);

      system.tick();

      // Piston should be extended
      expect(state.extended).toBe(true);

      // The block at (px+2, py, pz) should have moved to (px+3, py, pz)
      expect(world.getBlock(px + 2, py, pz)).toBe(0); // Air (was pushed)
      expect(world.getBlock(px + 3, py, pz)).toBe(3); // Stone (moved here)
    });

    it('P-02: ピストンの頭が実座標で正しい位置に伸びる', () => {
      // Test that the piston extends relative to its real position
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      world.setBlock(px, py, pz, 22); // Piston at real pos
      world.setBlock(px + 1, py, pz, 0); // Air in front
      world.setBlock(px + 2, py, pz, 3); // Stone to push
      world.setBlock(px + 3, py, pz, 0); // Air beyond
      system.registerComponent(px, py, pz, 22);

      const state = system.getComponentState(px, py, pz);
      state.facing = 0; // +X

      world.setBlock(px - 1, py, pz, 18); // RedstoneBlock
      system.registerComponent(px - 1, py, pz, 18);

      system.tick();

      // Piston extended, stone pushed from (12,20,10) to (13,20,10)
      expect(world.getBlock(px + 1, py, pz)).toBe(0); // Air (piston head space)
      expect(world.getBlock(px + 2, py, pz)).toBe(0); // Air (stone pushed away)
      expect(world.getBlock(px + 3, py, pz)).toBe(3); // Stone at new position
    });
  });

  describe('TNT at real position', () => {
    it('T-01: TNTが実座標 (10,20,10) で爆発して周囲を破壊', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Place TNT surrounded by stone
      world.setBlock(px, py, pz, 24); // TNT
      world.setBlock(px + 1, py, pz, 3); // Stone next to TNT
      world.setBlock(px - 1, py, pz, 3); // Stone on other side
      world.setBlock(px, py + 1, pz, 3); // Stone above
      world.setBlock(px, py - 1, pz, 3); // Stone below
      system.registerComponent(px, py, pz, 24);

      // Power the TNT via dust: RedstoneBlock -> dust -> TNT
      world.setBlock(px + 2, py, pz, 18); // RedstoneBlock
      world.setBlock(px + 1, py, pz, 13); // RedstoneDust (conducts signal)
      system.registerComponent(px + 2, py, pz, 18);
      system.registerComponent(px + 1, py, pz, 13);

      system.tick();

      const tntState = system.getComponentState(px, py, pz);
      expect(tntState.on).toBe(true); // Lit
      expect(tntState.fuse).toBeGreaterThan(0);

      // Advance time until fuse expires (36 ticks)
      for (let i = 0; i < 36; i++) {
        system.tick();
      }

      // After explosion, blocks near TNT should be air
      // The TNT itself should be air
      expect(world.getBlock(px, py, pz)).toBe(0); // TNT exploded
    });
  });

  describe('Dust brightness at real position', () => {
    it('D-01: 実座標 (10,20,10) のdustが電力レベルに応じた明るさを返す', () => {
      const { system, world } = createSystem();

      // Place RedstoneBlock at (9, 20, 10) and dust at (10, 20, 10)
      world.setBlock(9, 20, 10, 18); // RedstoneBlock
      world.setBlock(10, 20, 10, 13); // RedstoneDust
      system.registerComponent(9, 20, 10, 18);
      system.registerComponent(10, 20, 10, 13);

      system.tick();

      // Dust at (10,20,10) should have level 14 (15 - 1)
      const level = system.getDustRenderLevel(10, 20, 10);
      expect(level).toBe(14);

      // Dust brightness should be high (> 1.0)
      // This is tested indirectly through the MeshBuilder wiring
    });
  });

  describe('Texture key at real position', () => {
    it('TX-01: getRenderTextureKey が実座標で正しいテクスチャを返す', () => {
      const { system, world } = createSystem();
      const px = 10, py = 20, pz = 10;

      // Lamp off
      world.setBlock(px, py, pz, 15); // RedstoneLamp
      system.registerComponent(px, py, pz, 15);

      const texKey = system.getRenderTextureKey(px, py, pz);
      expect(texKey).toBe('redstone_lamp_off');

      // Power the lamp
      world.setBlock(px + 1, py, pz, 18); // RedstoneBlock
      system.registerComponent(px + 1, py, pz, 18);
      system.tick();

      const texKey2 = system.getRenderTextureKey(px, py, pz);
      expect(texKey2).toBe('redstone_lamp_on');
    });
  });

  describe('Multiple components at different real positions', () => {
    it('MP-01: 複数のコンポーネントが異なる実座標で独立に動作', () => {
      const { system, world } = createSystem();

      // Lamp A at (10, 20, 10) — powered
      world.setBlock(10, 20, 10, 15); // Lamp
      world.setBlock(11, 20, 10, 18); // RedstoneBlock
      system.registerComponent(10, 20, 10, 15);
      system.registerComponent(11, 20, 10, 18);

      // Lamp B at (30, 20, 30) — unpowered
      world.setBlock(30, 20, 30, 15); // Lamp
      system.registerComponent(30, 20, 30, 15);

      system.tick();

      const lampA = system.getComponentState(10, 20, 10);
      const lampB = system.getComponentState(30, 20, 30);

      // Lamp A should be lit
      expect(lampA.on).toBe(true);
      // Lamp B should be unlit
      expect(lampB.on).toBe(false);

      // Texture keys should differ
      expect(system.getRenderTextureKey(10, 20, 10)).toBe('redstone_lamp_on');
      expect(system.getRenderTextureKey(30, 20, 30)).toBe('redstone_lamp_off');
    });
  });
});
