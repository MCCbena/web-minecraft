import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * DaylightDetector: outputs 0-15 based on time of day.
 * Right-click toggles inverted mode.
 *
 * sunLevel = 0 at night, 15 at noon.
 * out = inverted ? (15 - sunLevel) : sunLevel
 */
export class DaylightDetector extends RedstoneComponent {
  readonly type = RedstoneComponentType.DaylightDetector;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    const sunLevel = this.getSunLevel(ctx.timeOfDay);
    const inverted = state.inverted || false;
    const output = inverted ? 15 - sunLevel : sunLevel;

    // Update the state for PowerGrid to pick up
    state.on = output > 0;
    state.prevOutputLevel = output;
    state.lockedLevel = output;
  }

  private getSunLevel(timeOfDay: number): number {
    // timeOfDay: 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
    const sunHeight = Math.sin(timeOfDay * Math.PI * 2);
    // Map to 0-15
    return Math.max(0, Math.min(15, Math.round((sunHeight + 1) * 7.5)));
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    state.inverted = !state.inverted;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'daylight_detector';
  }
}

declare module '../RedstoneTypes' {
  interface RedstoneState {
    inverted?: boolean;
    prevOutputLevel?: number;
  }
}
