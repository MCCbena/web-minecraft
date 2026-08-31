import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx } from '../RedstoneTypes.js';

/**
 * RedstoneOre: always a strong source (15).
 */
export class RedstoneOre extends RedstoneComponent {
  readonly type = RedstoneComponentType.RedstoneOre;

  tick(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Always on
  }

  interact(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Cannot interact
  }

  getTextureKey(_state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    return 'redstone_ore';
  }
}
