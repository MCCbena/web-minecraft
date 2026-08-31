/**
 * Block type definitions with metadata.
 * All block names in Japanese for HUD display.
 */

export enum BlockType {
  Air = 0,
  Grass,
  Dirt,
  Stone,
  Sand,
  Gravel,
  OakLog,
  OakLeaves,
  Planks,
  Water,
  Cobblestone,
  Bedrock,
  Lava,
  // Redstone components (Phase C)
  RedstoneDust,
  RedstoneTorch,
  RedstoneLamp,
  Lever,
  Button,
  RedstoneBlock,
  Repeater,
  Comparator,
  Observer,
  Piston,
  StickyPiston,
  TNT,
  DaylightDetector,
  NoteBlock,
  Hopper,
  RedstoneOre,
  Target,
}

export interface BlockMeta {
  solid: boolean;
  opaque: boolean;
  breakable: boolean;
  nameJp: string;
  /** texture keys: { top: string, bottom: string, side: string } */
  texture: { top: string; bottom: string; side: string };
}

const BLOCKS: Record<BlockType, BlockMeta> = {
  [BlockType.Air]: {
    solid: false,
    opaque: false,
    breakable: false,
    nameJp: '空気',
    texture: { top: 'air', bottom: 'air', side: 'air' },
  },
  [BlockType.Grass]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '草ブロック',
    texture: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' },
  },
  [BlockType.Dirt]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '土',
    texture: { top: 'dirt', bottom: 'dirt', side: 'dirt' },
  },
  [BlockType.Stone]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '石',
    texture: { top: 'stone', bottom: 'stone', side: 'stone' },
  },
  [BlockType.Sand]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '砂',
    texture: { top: 'sand', bottom: 'sand', side: 'sand' },
  },
  [BlockType.Gravel]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '砂利',
    texture: { top: 'gravel', bottom: 'gravel', side: 'gravel' },
  },
  [BlockType.OakLog]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'オークの原木',
    texture: { top: 'log_top', bottom: 'log_top', side: 'log_side' },
  },
  [BlockType.OakLeaves]: {
    solid: true,
    opaque: false,
    breakable: true,
    nameJp: 'オークの葉',
    texture: { top: 'leaves', bottom: 'leaves', side: 'leaves' },
  },
  [BlockType.Planks]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '板材',
    texture: { top: 'planks', bottom: 'planks', side: 'planks' },
  },
  [BlockType.Water]: {
    solid: false,
    opaque: false,
    breakable: false,
    nameJp: '水',
    texture: { top: 'water', bottom: 'water', side: 'water' },
  },
  [BlockType.Cobblestone]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '丸石',
    texture: { top: 'cobblestone', bottom: 'cobblestone', side: 'cobblestone' },
  },
  [BlockType.Bedrock]: {
    solid: true,
    opaque: true,
    breakable: false,
    nameJp: 'ベッドロック',
    texture: { top: 'bedrock', bottom: 'bedrock', side: 'bedrock' },
  },
  [BlockType.Lava]: {
    solid: false,
    opaque: false,
    breakable: false,
    nameJp: '溶岩',
    texture: { top: 'lava', bottom: 'lava', side: 'lava' },
  },
  // Redstone components
  [BlockType.RedstoneDust]: {
    solid: false,
    opaque: false,
    breakable: true,
    nameJp: 'レッドストーン',
    texture: { top: 'redstone_dust', bottom: 'redstone_dust', side: 'redstone_dust' },
  },
  [BlockType.RedstoneTorch]: {
    solid: false,
    opaque: false,
    breakable: true,
    nameJp: 'レッドストーン火把',
    texture: { top: 'redstone_torch_on', bottom: 'redstone_torch_on', side: 'redstone_torch_on' },
  },
  [BlockType.RedstoneLamp]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'レッドストーン灯籠',
    texture: { top: 'redstone_lamp_off', bottom: 'redstone_lamp_off', side: 'redstone_lamp_off' },
  },
  [BlockType.Lever]: {
    solid: false,
    opaque: false,
    breakable: true,
    nameJp: 'レバー',
    texture: { top: 'lever_off', bottom: 'lever_off', side: 'lever_off' },
  },
  [BlockType.Button]: {
    solid: false,
    opaque: false,
    breakable: true,
    nameJp: 'ボタン',
    texture: { top: 'button_off', bottom: 'button_off', side: 'button_off' },
  },
  [BlockType.RedstoneBlock]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'レッドストーンブロック',
    texture: { top: 'redstone_block', bottom: 'redstone_block', side: 'redstone_block' },
  },
  [BlockType.Repeater]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'リピータ',
    texture: { top: 'repeater_off_east', bottom: 'repeater_off_east', side: 'repeater_off_east' },
  },
  [BlockType.Comparator]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'コンパレータ',
    texture: { top: 'comparator_off_east', bottom: 'comparator_off_east', side: 'comparator_off_east' },
  },
  [BlockType.Observer]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'オブザーバ',
    texture: { top: 'observer_off_up', bottom: 'observer_off_up', side: 'observer_off_up' },
  },
  [BlockType.Piston]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'ピストン',
    texture: { top: 'piston_retracted_up', bottom: 'piston_retracted_up', side: 'piston_retracted_up' },
  },
  [BlockType.StickyPiston]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '粘着ピストン',
    texture: { top: 'piston_retracted_up', bottom: 'piston_retracted_up', side: 'piston_retracted_up' },
  },
  [BlockType.TNT]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'TNT',
    texture: { top: 'tnt_unlit', bottom: 'tnt_unlit', side: 'tnt_unlit' },
  },
  [BlockType.DaylightDetector]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '日中検知器',
    texture: { top: 'daylight_detector', bottom: 'daylight_detector', side: 'daylight_detector' },
  },
  [BlockType.NoteBlock]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: '音符ブロック',
    texture: { top: 'note_block', bottom: 'note_block', side: 'note_block' },
  },
  [BlockType.Hopper]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'ホッパー',
    texture: { top: 'hopper', bottom: 'hopper', side: 'hopper' },
  },
  [BlockType.RedstoneOre]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'レッドストーン鉱石',
    texture: { top: 'redstone_ore', bottom: 'redstone_ore', side: 'redstone_ore' },
  },
  [BlockType.Target]: {
    solid: true,
    opaque: true,
    breakable: true,
    nameJp: 'ターゲット',
    texture: { top: 'target', bottom: 'target', side: 'target' },
  },
};

export function getBlockMeta(type: BlockType): BlockMeta {
  return BLOCKS[type] ?? BLOCKS[BlockType.Air];
}

export function isSolid(type: BlockType): boolean {
  return getBlockMeta(type).solid;
}

export function isOpaque(type: BlockType): boolean {
  return getBlockMeta(type).opaque;
}

export function isBreakable(type: BlockType): boolean {
  return getBlockMeta(type).breakable;
}

export function isTransparent(type: BlockType): boolean {
  return !isOpaque(type) && type !== BlockType.Air;
}

export function getBlockNameJp(type: BlockType): string {
  return getBlockMeta(type).nameJp;
}
