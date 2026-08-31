import { RedstoneComponent } from './Component.js';
import { RedstoneComponentType, RedstoneState, RedstoneCtx, DIR_DELTAS, oppositeDir } from '../RedstoneTypes.js';

/**
 * Comparator: subtract or compare mode.
 * Right-click: cycle facing. Shift+right-click: toggle mode.
 *
 * subtract mode: out = max(0, input - max(side1, side2))
 * compare mode: out = (input > max(side1, side2)) ? input : 0
 */
export class Comparator extends RedstoneComponent {
  readonly type = RedstoneComponentType.Comparator;

  tick(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    // Input is on the face opposite to facing (back face)
    const backDir = oppositeDir(state.facing);
    const [bdx, bdy, bdz] = DIR_DELTAS[backDir];

    const inputX = x + bdx, inputY = y + bdy, inputZ = z + bdz;
    const isStrong = ctx.power.isStronglyPowered(inputX, inputY, inputZ);
    const dustLvl = ctx.power.dustLevel(inputX, inputY, inputZ);
    const inputLevel = isStrong || dustLvl > 0 ? 15 : 0;

    // Side inputs (the two faces perpendicular to facing axis)
    const sideDirs = getSideDirs(state.facing);
    const side1Dir = sideDirs[0];
    const side2Dir = sideDirs[1];
    const [s1x, s1y, s1z] = DIR_DELTAS[side1Dir];
    const [s2x, s2y, s2z] = DIR_DELTAS[side2Dir];

    const side1Strong = ctx.power.isStronglyPowered(x + s1x, y + s1y, z + s1z);
    const side1Dust = ctx.power.dustLevel(x + s1x, y + s1y, z + s1z);
    const side1Level = side1Strong || side1Dust > 0 ? 15 : 0;
    const side2Strong = ctx.power.isStronglyPowered(x + s2x, y + s2y, z + s2z);
    const side2Dust = ctx.power.dustLevel(x + s2x, y + s2y, z + s2z);
    const side2Level = side2Strong || side2Dust > 0 ? 15 : 0;
    const maxSide = Math.max(side1Level, side2Level);

    let output = 0;
    if (state.mode === 1) {
      // Subtract mode
      output = Math.max(0, inputLevel - maxSide);
    } else {
      // Compare mode
      output = inputLevel > maxSide ? inputLevel : 0;
    }

    state.lockedLevel = output;
    state.on = output > 0;
  }

  interact(state: RedstoneState, ctx: RedstoneCtx, x: number, y: number, z: number): void {
    state.facing = (state.facing + 1) % 6;
  }

  toggleMode(state: RedstoneState): void {
    state.mode = state.mode === 0 ? 1 : 0;
  }

  getTextureKey(state: RedstoneState, _ctx: RedstoneCtx, x: number, y: number, z: number): string {
    const dirName = ['east', 'west', 'up', 'down', 'north', 'south'][state.facing] || 'east';
    const modeStr = state.mode === 1 ? '_subtract' : '';
    return state.on ? `comparator_on_${dirName}${modeStr}` : `comparator_off_${dirName}${modeStr}`;
  }
}

/**
 * Get the two side directions perpendicular to the facing axis.
 * DIR_DELTAS order: [0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z]
 */
function getSideDirs(facing: number): [number, number] {
  if (facing === 0 || facing === 1) return [4, 5];   // X-facing → Z-axis sides
  if (facing === 4 || facing === 5) return [0, 1];   // Z-facing → X-axis sides
  return [0, 1];                    // Y-facing → X-axis sides
}
