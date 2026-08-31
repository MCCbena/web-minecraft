import * as THREE from 'three';
import { BlockType } from './BlockTypes.js';

/**
 * Procedurally generates a texture atlas on a Canvas.
 * Each tile is 16×16 pixels. Atlas is 512×512 (32 columns × 32 rows).
 */
export class TextureAtlas {
  public texture: THREE.CanvasTexture;
  public uvMap: Map<string, { u: number; v: number; w: number; h: number }>;

  private static TILE_SIZE = 16;
  private static ATLAS_SIZE = 512;
  private static TILES_PER_ROW = 32;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = TextureAtlas.ATLAS_SIZE;
    canvas.height = TextureAtlas.ATLAS_SIZE;
    const ctx = canvas.getContext('2d')!;

    this.uvMap = new Map();

    // Generate base textures (row 0)
    this.drawGrassTop(ctx, 0, 0);
    this.drawGrassSide(ctx, 1, 0);
    this.drawDirt(ctx, 2, 0);
    this.drawStone(ctx, 3, 0);
    this.drawSand(ctx, 4, 0);
    this.drawGravel(ctx, 5, 0);
    this.drawLogTop(ctx, 6, 0);
    this.drawLogSide(ctx, 7, 0);
    this.drawLeaves(ctx, 8, 0);
    this.drawPlanks(ctx, 9, 0);
    this.drawWater(ctx, 10, 0);
    this.drawCobblestone(ctx, 11, 0);
    this.drawBedrock(ctx, 12, 0);
    this.drawLava(ctx, 13, 0);

    // Generate redstone textures (rows 1+)
    this.drawRedstoneDust(ctx, 14, 1);
    this.drawRedstoneTorchOn(ctx, 15, 1);
    this.drawRedstoneTorchOff(ctx, 16, 1);
    this.drawRedstoneLampOn(ctx, 17, 1);
    this.drawRedstoneLampOff(ctx, 18, 1);
    this.drawLeverOn(ctx, 19, 1);
    this.drawLeverOff(ctx, 20, 1);
    this.drawButtonPressed(ctx, 21, 1);
    this.drawButtonOff(ctx, 22, 1);
    this.drawRedstoneBlock(ctx, 23, 1);
    this.drawRedstoneOre(ctx, 24, 1);
    this.drawRepeaterOn(ctx, 25, 1);
    this.drawRepeaterOff(ctx, 26, 1);
    this.drawComparatorOn(ctx, 27, 1);
    this.drawComparatorOff(ctx, 28, 1);
    this.drawObserverOn(ctx, 29, 1);
    this.drawObserverOff(ctx, 30, 1);
    this.drawPistonExtended(ctx, 31, 1);
    this.drawPistonRetracted(ctx, 0, 2);
    this.drawTntLit(ctx, 1, 2);
    this.drawTntUnlit(ctx, 2, 2);
    this.drawDaylightDetector(ctx, 3, 2);
    this.drawNoteBlock(ctx, 4, 2);
    this.drawHopper(ctx, 5, 2);
    this.drawTarget(ctx, 6, 2);

    // Map texture keys to UV rectangles
    const tilePositions: [string, number, number][] = [
      ['air', 0, 0],
      ['grass_top', 0, 0],
      ['grass_side', 1, 0],
      ['dirt', 2, 0],
      ['stone', 3, 0],
      ['sand', 4, 0],
      ['gravel', 5, 0],
      ['log_top', 6, 0],
      ['log_side', 7, 0],
      ['leaves', 8, 0],
      ['planks', 9, 0],
      ['water', 10, 0],
      ['cobblestone', 11, 0],
      ['bedrock', 12, 0],
      ['lava', 13, 0],
      // Redstone textures
      ['redstone_dust', 14, 1],
      ['redstone_torch_on', 15, 1],
      ['redstone_torch_off', 16, 1],
      ['redstone_lamp_on', 17, 1],
      ['redstone_lamp_off', 18, 1],
      ['lever_on', 19, 1],
      ['lever_off', 20, 1],
      ['button_pressed', 21, 1],
      ['button_off', 22, 1],
      ['redstone_block', 23, 1],
      ['redstone_ore', 24, 1],
      ['repeater_on_east', 25, 1],
      ['repeater_off_east', 26, 1],
      ['comparator_on_east', 27, 1],
      ['comparator_off_east', 28, 1],
      ['observer_on_up', 29, 1],
      ['observer_off_up', 30, 1],
      ['piston_extended_up', 31, 1],
      ['piston_retracted_up', 0, 2],
      ['tnt_lit', 1, 2],
      ['tnt_unlit', 2, 2],
      ['daylight_detector', 3, 2],
      ['note_block', 4, 2],
      ['hopper', 5, 2],
      ['target', 6, 2],
    ];

    for (const [key, col, row] of tilePositions) {
      this.uvMap.set(key, {
        u: col / TextureAtlas.TILES_PER_ROW,
        // flipY=true (default): canvas row 0 (top) maps to v≈1.0, so invert V.
        v: 1 - (row + 1) / TextureAtlas.TILES_PER_ROW,
        w: TextureAtlas.TILE_SIZE / TextureAtlas.ATLAS_SIZE,
        h: TextureAtlas.TILE_SIZE / TextureAtlas.ATLAS_SIZE,
      });
    }

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  private drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  private addNoise(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, baseColor: string, variation: number): void {
    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, w, h);
    const rng = this.seededRandom(x * 1000 + y);
    for (let i = 0; i < 30; i++) {
      const px = x + Math.floor(rng() * w);
      const py = y + Math.floor(rng() * h);
      const shade = (rng() - 0.5) * variation;
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);
      const nr = Math.max(0, Math.min(255, r + shade));
      const ng = Math.max(0, Math.min(255, g + shade));
      const nb = Math.max(0, Math.min(255, b + shade));
      ctx.fillStyle = `rgb(${nr},${ng},${nb})`;
      ctx.fillRect(px, py, 1, 1);
    }
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 4294967296;
    };
  }

  // Existing base textures
  private drawGrassTop(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#5a8c2a', 30);
    const rng = this.seededRandom(col * 100 + row);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(40,80,20,${rng() * 0.5})`;
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 1, 1);
    }
  }

  private drawGrassSide(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 4, '#5a8c2a');
    this.addNoise(ctx, x, y + 4, 16, 12, '#8b6914', 20);
    const rng = this.seededRandom(col * 200 + row);
    for (let i = 0; i < 5; i++) {
      const px = x + Math.floor(rng() * 16);
      ctx.fillStyle = '#5a8c2a';
      ctx.fillRect(px, y + 3 + Math.floor(rng() * 3), 1, 1);
    }
  }

  private drawDirt(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    this.addNoise(ctx, col * TextureAtlas.TILE_SIZE, row * TextureAtlas.TILE_SIZE, 16, 16, '#8b6914', 25);
  }

  private drawStone(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    this.addNoise(ctx, col * TextureAtlas.TILE_SIZE, row * TextureAtlas.TILE_SIZE, 16, 16, '#7a7a7a', 35);
    const rng = this.seededRandom(col * 300 + row);
    ctx.strokeStyle = 'rgba(50,50,50,0.4)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(col * 16 + rng() * 16, row * 16 + rng() * 16);
      ctx.lineTo(col * 16 + rng() * 16, row * 16 + rng() * 16);
      ctx.stroke();
    }
  }

  private drawSand(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    this.addNoise(ctx, col * TextureAtlas.TILE_SIZE, row * TextureAtlas.TILE_SIZE, 16, 16, '#e8d68c', 20);
  }

  private drawGravel(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#6a6a6a', 30);
    const rng = this.seededRandom(col * 400 + row);
    for (let i = 0; i < 8; i++) {
      const shade = 80 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x + Math.floor(rng() * 14), y + Math.floor(rng() * 14), 2, 2);
    }
  }

  private drawLogTop(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#6b4400');
    const rng = this.seededRandom(col * 500 + row);
    ctx.strokeStyle = '#4a2e00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawLogSide(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#6b4400', 20);
    const rng = this.seededRandom(col * 600 + row);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(40,25,0,${0.2 + rng() * 0.3})`;
      ctx.fillRect(x + Math.floor(rng() * 16), y, 1, 16);
    }
  }

  private drawLeaves(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#2d6b1e');
    const rng = this.seededRandom(col * 700 + row);
    for (let i = 0; i < 20; i++) {
      const shade = Math.floor(rng() * 40);
      ctx.fillStyle = `rgb(${30 + shade},${80 + shade},${20 + shade})`;
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 2, 2);
    }
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 1, 1);
    }
  }

  private drawPlanks(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#9e7c4a', 20);
    const rng = this.seededRandom(col * 800 + row);
    ctx.strokeStyle = 'rgba(60,40,10,0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + i * 4);
      ctx.lineTo(x + 16, y + i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#4a3520';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 3 + Math.floor(rng() * 10), y + i * 4 + 1, 1, 1);
    }
  }

  private drawWater(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#2244aa');
    const rng = this.seededRandom(col * 900 + row);
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = `rgba(50,100,200,${0.2 + rng() * 0.3})`;
      ctx.fillRect(x, y + Math.floor(rng() * 16), 16, 1);
    }
  }

  private drawCobblestone(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#5a5a5a', 40);
    const rng = this.seededRandom(col * 1000 + row);
    for (let i = 0; i < 6; i++) {
      const shade = 60 + Math.floor(rng() * 60);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      const px = x + Math.floor(rng() * 12);
      const py = y + Math.floor(rng() * 12);
      ctx.fillRect(px, py, 3 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 3));
      ctx.strokeStyle = 'rgba(30,30,30,0.5)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, 3 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 3));
    }
  }

  private drawBedrock(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#1a1a1a', 20);
    const rng = this.seededRandom(col * 1100 + row);
    for (let i = 0; i < 12; i++) {
      const shade = 15 + Math.floor(rng() * 25);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 2 + Math.floor(rng() * 3), 2 + Math.floor(rng() * 3));
    }
  }

  private drawLava(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#cc4400');
    const rng = this.seededRandom(col * 1200 + row);
    for (let i = 0; i < 20; i++) {
      const shade = Math.floor(rng() * 60);
      ctx.fillStyle = `rgb(${180 + shade},${40 + Math.floor(shade * 0.3)},${Math.floor(shade * 0.1)})`;
      ctx.fillRect(x + Math.floor(rng() * 16), y + Math.floor(rng() * 16), 2, 2);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(255,200,50,${0.3 + rng() * 0.4})`;
      ctx.fillRect(x + Math.floor(rng() * 14), y + Math.floor(rng() * 14), 2, 2);
    }
  }

  // === Redstone textures ===

  private drawRedstoneDust(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Dark red line on stone-like background
    this.drawRect(ctx, x, y, 16, 16, '#3a2010');
    // Red dust line in center
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(x + 2, y + 7, 12, 2);
    ctx.fillRect(x + 6, y + 3, 2, 10);
    // Bright center
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(x + 6, y + 7, 4, 2);
  }

  private drawRedstoneTorchOn(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Stick
    this.drawRect(ctx, x + 7, y + 4, 2, 10, '#5a3a1a');
    // Flame/glow
    this.drawRect(ctx, x + 5, y + 1, 6, 5, '#ff6600');
    this.drawRect(ctx, x + 6, y + 2, 4, 3, '#ffaa00');
    this.drawRect(ctx, x + 7, y + 3, 2, 2, '#ffff00');
  }

  private drawRedstoneTorchOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Stick
    this.drawRect(ctx, x + 7, y + 4, 2, 10, '#5a3a1a');
    // Unlit top
    this.drawRect(ctx, x + 6, y + 2, 4, 4, '#8b4513');
    this.drawRect(ctx, x + 7, y + 3, 2, 2, '#6b3410');
  }

  private drawRedstoneLampOn(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Frame
    this.drawRect(ctx, x, y, 16, 16, '#5a3a1a');
    // Glowing center
    this.drawRect(ctx, x + 2, y + 2, 12, 12, '#ffaa00');
    this.drawRect(ctx, x + 3, y + 3, 10, 10, '#ffff00');
    this.drawRect(ctx, x + 5, y + 5, 6, 6, '#ffffff');
  }

  private drawRedstoneLampOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Frame
    this.drawRect(ctx, x, y, 16, 16, '#5a3a1a');
    // Dark center
    this.drawRect(ctx, x + 2, y + 2, 12, 12, '#3a2a1a');
    this.drawRect(ctx, x + 3, y + 3, 10, 10, '#2a1a0a');
  }

  private drawLeverOn(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x + 4, y + 8, 8, 6, '#5a5a5a');
    // Handle (up position)
    this.drawRect(ctx, x + 6, y + 2, 4, 8, '#8b4513');
    this.drawRect(ctx, x + 7, y + 1, 2, 3, '#cc0000');
  }

  private drawLeverOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x + 4, y + 8, 8, 6, '#5a5a5a');
    // Handle (down position)
    this.drawRect(ctx, x + 6, y + 6, 4, 6, '#8b4513');
    this.drawRect(ctx, x + 7, y + 5, 2, 3, '#555555');
  }

  private drawButtonPressed(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x + 3, y + 4, 10, 10, '#7a7a7a');
    // Pressed button (slightly inset)
    this.drawRect(ctx, x + 5, y + 6, 6, 6, '#cc0000');
    this.drawRect(ctx, x + 6, y + 7, 4, 4, '#ff3333');
  }

  private drawButtonOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x + 3, y + 4, 10, 10, '#7a7a7a');
    // Unpressed button
    this.drawRect(ctx, x + 5, y + 5, 6, 6, '#8b4513');
    this.drawRect(ctx, x + 6, y + 6, 4, 4, '#6b3410');
  }

  private drawRedstoneBlock(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.addNoise(ctx, x, y, 16, 16, '#cc0000', 30);
    // Highlight edges
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 15, 15);
  }

  private drawRedstoneOre(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Stone base
    this.addNoise(ctx, x, y, 16, 16, '#7a7a7a', 20);
    // Redstone specks
    const rng = this.seededRandom(col * 2000 + row);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgb(${180 + Math.floor(rng() * 75)},${Math.floor(rng() * 30)},${Math.floor(rng() * 30)})`;
      ctx.fillRect(x + Math.floor(rng() * 14), y + Math.floor(rng() * 14), 2, 2);
    }
  }

  private drawRepeaterOn(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Redstone torches (lit)
    this.drawRect(ctx, x + 3, y + 6, 2, 4, '#ff6600');
    this.drawRect(ctx, x + 11, y + 6, 2, 4, '#ff6600');
    // Torch flames
    this.drawRect(ctx, x + 3, y + 4, 2, 3, '#ffaa00');
    this.drawRect(ctx, x + 11, y + 4, 2, 3, '#ffaa00');
    // Input/output indicators
    this.drawRect(ctx, x + 1, y + 7, 2, 2, '#cc0000');
    this.drawRect(ctx, x + 13, y + 7, 2, 2, '#cc0000');
  }

  private drawRepeaterOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Redstone torches (unlit)
    this.drawRect(ctx, x + 3, y + 6, 2, 4, '#8b4513');
    this.drawRect(ctx, x + 11, y + 6, 2, 4, '#8b4513');
    // Input/output indicators
    this.drawRect(ctx, x + 1, y + 7, 2, 2, '#555555');
    this.drawRect(ctx, x + 13, y + 7, 2, 2, '#555555');
  }

  private drawComparatorOn(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base (triangular shape suggestion)
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Lit torches
    this.drawRect(ctx, x + 3, y + 5, 2, 5, '#ff6600');
    this.drawRect(ctx, x + 11, y + 5, 2, 5, '#ff6600');
    // Flames
    this.drawRect(ctx, x + 3, y + 3, 2, 3, '#ffaa00');
    this.drawRect(ctx, x + 11, y + 3, 2, 3, '#ffaa00');
  }

  private drawComparatorOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    this.drawRect(ctx, x + 3, y + 5, 2, 5, '#8b4513');
    this.drawRect(ctx, x + 11, y + 5, 2, 5, '#8b4513');
  }

  private drawObserverOn(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Eye/lens (glowing)
    this.drawRect(ctx, x + 4, y + 4, 8, 8, '#ff6600');
    this.drawRect(ctx, x + 5, y + 5, 6, 6, '#ffaa00');
    this.drawRect(ctx, x + 7, y + 7, 2, 2, '#ffffff');
  }

  private drawObserverOff(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    this.drawRect(ctx, x + 4, y + 4, 8, 8, '#3a3a3a');
    this.drawRect(ctx, x + 5, y + 5, 6, 6, '#2a2a2a');
  }

  private drawPistonExtended(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Extended head
    this.drawRect(ctx, x + 12, y + 2, 4, 12, '#8b6914');
    this.drawRect(ctx, x + 13, y + 3, 2, 10, '#6b4400');
  }

  private drawPistonRetracted(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Retracted head
    this.drawRect(ctx, x + 12, y + 4, 4, 8, '#8b6914');
    this.drawRect(ctx, x + 13, y + 5, 2, 6, '#6b4400');
  }

  private drawTntLit(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Body
    this.drawRect(ctx, x, y, 16, 16, '#cc0000');
    // "TNT" text suggestion
    this.drawRect(ctx, x + 2, y + 4, 12, 8, '#ffffff');
    this.drawRect(ctx, x + 3, y + 5, 2, 2, '#cc0000');
    this.drawRect(ctx, x + 6, y + 5, 2, 2, '#cc0000');
    this.drawRect(ctx, x + 9, y + 5, 2, 2, '#cc0000');
    // Fuse spark
    this.drawRect(ctx, x + 7, y + 1, 2, 3, '#ffaa00');
    this.drawRect(ctx, x + 7, y + 0, 2, 2, '#ffff00');
  }

  private drawTntUnlit(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    this.drawRect(ctx, x, y, 16, 16, '#cc0000');
    this.drawRect(ctx, x + 2, y + 4, 12, 8, '#ffffff');
    this.drawRect(ctx, x + 3, y + 5, 2, 2, '#cc0000');
    this.drawRect(ctx, x + 6, y + 5, 2, 2, '#cc0000');
    this.drawRect(ctx, x + 9, y + 5, 2, 2, '#cc0000');
    // Unlit fuse
    this.drawRect(ctx, x + 7, y + 1, 2, 3, '#8b4513');
  }

  private drawDaylightDetector(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#5a5a5a');
    // Glass top
    this.drawRect(ctx, x + 2, y + 2, 12, 12, '#88aaff');
    this.drawRect(ctx, x + 3, y + 3, 10, 10, '#aaccff');
    // Sun/moon indicator
    const rng = this.seededRandom(col * 3000 + row);
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawNoteBlock(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Wood base
    this.addNoise(ctx, x, y, 16, 16, '#9e7c4a', 15);
    // Note symbol
    this.drawRect(ctx, x + 5, y + 4, 6, 8, '#5a3a1a');
    this.drawRect(ctx, x + 4, y + 3, 8, 2, '#5a3a1a');
    // White top
    this.drawRect(ctx, x + 5, y + 4, 6, 3, '#ffffff');
  }

  private drawHopper(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Top opening
    this.drawRect(ctx, x + 2, y, 12, 4, '#5a5a5a');
    // Body
    this.drawRect(ctx, x + 4, y + 4, 8, 6, '#3a3a3a');
    // Bottom nozzle
    this.drawRect(ctx, x + 6, y + 10, 4, 6, '#2a2a2a');
  }

  private drawTarget(ctx: CanvasRenderingContext2D, col: number, row: number): void {
    const x = col * TextureAtlas.TILE_SIZE;
    const y = row * TextureAtlas.TILE_SIZE;
    // Base
    this.drawRect(ctx, x, y, 16, 16, '#8b4513');
    // Rings
    this.drawRect(ctx, x + 2, y + 2, 12, 12, '#cc0000');
    this.drawRect(ctx, x + 4, y + 4, 8, 8, '#ffffff');
    this.drawRect(ctx, x + 6, y + 6, 4, 4, '#cc0000');
    this.drawRect(ctx, x + 7, y + 7, 2, 2, '#ffffff');
  }

  /** Get UV rect for a texture key. */
  getUV(key: string): { u: number; v: number; w: number; h: number } | undefined {
    return this.uvMap.get(key);
  }
}
