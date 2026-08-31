import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * RedstoneTorch: inverter. Lit when support block is NOT powered.
 * Acts as a strong source (15) when lit.
 */
export class RedstoneTorch extends RedstoneComponent {
  readonly type = RedstoneComponentType.RedstoneTorch;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Torch state is managed by PowerGrid based on support power
    // But we need to detect state changes and trigger remesh
    const wasLit = state.prevLit;
    if (wasLit !== state.on) {
      state.prevLit = state.on;
      ctx.scheduleRemesh(x, y, z);
    }
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact with torch directly
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return state.on ? 'redstone_torch_on' : 'redstone_torch_off';
  }
}
