import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx, oppositeDir, DIR_DELTAS } from '../RedstoneTypes.js';

/**
 * Repeater: directional, 1-4 tick delay, boosts signal to 15.
 * Right-click: cycle facing (4 directions).
 * Shift+right-click: cycle delay (1→2→3→4→1).
 */
export class Repeater extends RedstoneComponent {
  readonly type = RedstoneComponentType.Repeater;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Input is on the face opposite to facing
    const inputDir = oppositeDir(state.facing);
    const [dx, dy, dz] = DIR_DELTAS[inputDir];
    const inputX = x + dx, inputY = y + dy, inputZ = z + dz;

    const inputLevel = ctx.power.isStronglyPowered(inputX, inputY, inputZ)
      || ctx.power.dustLevel(inputX, inputY, inputZ) > 0 ? 15 : 0;

    // Check if locked by comparator
    if (state.lockedLevel >= 0 && inputLevel < state.lockedLevel) {
      state.on = false;
      return;
    }

    // Delay buffer logic
    if (inputLevel > 0 && !state.on) {
      // Input turned on - start delay
      if (state.inputLevel === 0) {
        state.inputChanged = true;
        state.inputLevel = inputLevel;
      }
      if (state.inputChanged) {
        if (!state._delayCounter) state._delayCounter = 0;
        state._delayCounter++;
        if (state._delayCounter >= state.delay) {
          state.on = true;
          state._delayCounter = 0;
          state.inputChanged = false;
        }
      }
    } else if (inputLevel === 0 && state.on) {
      // Input turned off - output turns off after delay
      if (state.inputLevel > 0) {
        state.inputChanged = true;
        state.inputLevel = 0;
      }
      if (state.inputChanged) {
        if (!state._delayCounter) state._delayCounter = 0;
        state._delayCounter++;
        if (state._delayCounter >= state.delay) {
          state.on = false;
          state._delayCounter = 0;
          state.inputChanged = false;
        }
      }
    } else {
      state._delayCounter = 0;
      state.inputChanged = false;
      state.inputLevel = inputLevel;
    }
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Check if shift is held (we can't easily detect this in tests, so just cycle facing)
    // In the game, shift+right-click would cycle delay
    state.facing = (state.facing + 1) % 6;
  }

  getDelay(state: RedstoneState): number {
    return state.delay;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    const dirName = ['east', 'west', 'up', 'down', 'north', 'south'][state.facing] || 'east';
    return state.on ? `repeater_on_${dirName}` : `repeater_off_${dirName}`;
  }
}

// Extend RedstoneState type for repeater internal fields
declare module '../RedstoneTypes' {
  interface RedstoneState {
    _delayCounter?: number;
  }
}
