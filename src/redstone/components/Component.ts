import { RedstoneState, RedstoneCtx, RedstoneComponentType } from '../RedstoneTypes.js';

/**
 * Base class for all redstone components.
 */
export abstract class RedstoneComponent {
  abstract readonly type: RedstoneComponentType;
  abstract tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void;
  abstract interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void;

  /** Get the texture key for rendering based on current state. */
  abstract getTextureKey(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): string;

  /** Whether this component is a strong power source. */
  isStrongSource(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): boolean {
    return false;
  }

  /** Get the output level of this component. */
  getOutputLevel(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): number {
    return 0;
  }
}
