import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx, DIR_DELTAS, posKey } from '../RedstoneTypes.js';

/**
 * Observer: detects block changes on the observed face.
 * Emits a 1-tick pulse (15) on the opposite face after a 1-tick cooldown.
 */
export class Observer extends RedstoneComponent {
  readonly type = RedstoneComponentType.Observer;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Observe the block on the facing side
    const [dx, dy, dz] = DIR_DELTAS[state.facing];
    const obsX = x + dx, obsY = y + dy, obsZ = z + dz;
    const observedBlock = ctx.world.getBlock(obsX, obsY, obsZ);

    // Create a state key for the observed block
    const currentObserved = posKey(obsX, obsY, obsZ) + ':' + observedBlock;

    if (state.lastObserved !== '' && state.lastObserved !== currentObserved) {
      // Block changed!
      if (state.cooldown <= 0) {
        state.cooldown = 2;
        state.on = true;
      }
    }

    state.lastObserved = currentObserved;

    // Decrement cooldown
    if (state.cooldown > 0) {
      state.cooldown--;
      if (state.cooldown === 0) {
        state.on = false;
      }
    }
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    state.facing = (state.facing + 1) % 6;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    const dirName = ['east', 'west', 'up', 'down', 'north', 'south'][state.facing] || 'east';
    return state.on ? `observer_on_${dirName}` : `observer_off_${dirName}`;
  }
}
