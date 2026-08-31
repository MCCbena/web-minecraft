import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';
import { CONFIG } from '../../config.js';

/**
 * Button: right-click presses for 200 ticks (10s), then releases.
 * Pressed = strong source 15.
 */
export class Button extends RedstoneComponent {
  readonly type = RedstoneComponentType.Button;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    if (state.pressedTicks > 0) {
      state.pressedTicks--;
      if (state.pressedTicks === 0) {
        // Button released - schedule remesh
        ctx.scheduleRemesh(x, y, z);
      }
    }
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    state.pressedTicks = CONFIG.redstone.buttonHoldTicks;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return state.pressedTicks > 0 ? 'button_pressed' : 'button_off';
  }
}
