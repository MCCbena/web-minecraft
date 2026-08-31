import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * Lever: right-click toggles on/off. ON = strong source 15.
 */
export class Lever extends RedstoneComponent {
  readonly type = RedstoneComponentType.Lever;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Lever state is externally toggled via interact()
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    state.on = !state.on;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return state.on ? 'lever_on' : 'lever_off';
  }
}
