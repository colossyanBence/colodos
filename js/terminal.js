import { getCommand, unknownCommandMessage } from './commands.js';

/**
 * Editable MS-DOS style terminal.
 * Renders to an offscreen 2D canvas; this canvas can be used as a WebGL texture
 * so shaders (CRT, scanlines, etc.) can be applied later.
 */
export class Terminal {
  constructor(cols = 80, rows = 25) {
    this.cols = cols;
    this.rows = rows;
    this.prompt = 'C:\\>';
    /** @type {string[]} */
    this.lines = [this.prompt];
    this.cursorIndex = this.prompt.length; // position within current line (after prompt)
    this.cursorBlink = 0;

    /** @type {string[]} */
    this.history = [];
    this.historyIndex = -1;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('2D context not available');

    this.fg = '#add8e6';
    this.bg = '#0a0a0a';
    this.cursorColor = '#add8e6';
    this.fontFamily = '"Perfect DOS VGA 437", sans-serif';
    /** Negative letter-spacing to tighten gaps (e.g. '-2px' or '-0.03em') */
    this.letterSpacing = '-0.04em';
    this.paddingX = 16;
    this.paddingY = 16;

    this.resize(800, 500);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    const contentW = width - 2 * this.paddingX;
    const contentH = height - 2 * this.paddingY;
    const cellW = contentW / this.cols;
    const cellH = contentH / this.rows;
    // Standard MS-DOS 80×25: character fills cell (classic ~8:16 width:height ratio)
    this.fontSize = Math.floor(cellH * 0.92);
    this.cellWidth = cellW;
    this.cellHeight = cellH;
    this.contentLeft = this.paddingX;
    this.contentTop = this.paddingY;
  }

  get currentLineContent() {
    return this.lines[this.lines.length - 1].slice(this.prompt.length);
  }

  set currentLineContent(s) {
    this.lines[this.lines.length - 1] = this.prompt + s;
  }

  /** Handle key down. Returns true if handled. */
  keydown(e) {
    const line = this.currentLineContent;
    const pos = this.cursorIndex - this.prompt.length;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (pos > 0) {
        this.currentLineContent = line.slice(0, pos - 1) + line.slice(pos);
        this.cursorIndex--;
      }
      return true;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      if (pos < line.length) {
        this.currentLineContent = line.slice(0, pos) + line.slice(pos + 1);
      }
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = line.trim().toLowerCase();
      if (cmd !== '') {
        this.history.push(line);
        this.historyIndex = -1;
      }
      if (cmd === '') {
        this.lines.push(this.prompt);
        this.cursorIndex = this.prompt.length;
        while (this.lines.length > this.rows) this.lines.shift();
      } else {
        const handler = getCommand(cmd);
        if (handler) {
          const result = handler();
          if (result.clear) {
            this.lines = [this.prompt];
            this.cursorIndex = this.prompt.length;
          } else if (result.lines && result.lines.length > 0) {
            for (const outputLine of result.lines) this.lines.push(outputLine);
            this.lines.push(this.prompt);
            this.cursorIndex = this.prompt.length;
            while (this.lines.length > this.rows) this.lines.shift();
          } else {
            this.lines.push(this.prompt);
            this.cursorIndex = this.prompt.length;
            while (this.lines.length > this.rows) this.lines.shift();
          }
        } else {
          this.lines.push(unknownCommandMessage);
          this.lines.push('');
          this.lines.push(this.prompt);
          this.cursorIndex = this.prompt.length;
          while (this.lines.length > this.rows) this.lines.shift();
        }
      }
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.history.length > 0) {
        if (this.historyIndex === -1) this.historyIndex = this.history.length;
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.currentLineContent = this.history[this.historyIndex];
          this.cursorIndex = this.prompt.length + this.currentLineContent.length;
        }
      }
      return true;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex !== -1) {
        this.historyIndex++;
        if (this.historyIndex >= this.history.length) {
          this.historyIndex = -1;
          this.currentLineContent = '';
          this.cursorIndex = this.prompt.length;
        } else {
          this.currentLineContent = this.history[this.historyIndex];
          this.cursorIndex = this.prompt.length + this.currentLineContent.length;
        }
      }
      return true;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (this.cursorIndex > this.prompt.length) this.cursorIndex--;
      return true;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (this.cursorIndex < this.prompt.length + line.length) this.cursorIndex++;
      return true;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      this.cursorIndex = this.prompt.length;
      return true;
    }
    if (e.key === 'End') {
      e.preventDefault();
      this.cursorIndex = this.prompt.length + line.length;
      return true;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const before = line.slice(0, pos);
      const after = line.slice(pos);
      this.currentLineContent = before + e.key + after;
      this.cursorIndex++;
      return true;
    }
    return false;
  }

  /** Draw terminal to the offscreen 2D canvas. */
  draw(time = 0) {
    const { ctx, cols, rows, width, height, fontSize, cellWidth, cellHeight, contentLeft, contentTop } = this;
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `${fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.fg;
    ctx.textBaseline = 'top';
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = this.letterSpacing;

    const startRow = Math.max(0, this.lines.length - rows);
    for (let r = 0; r < rows; r++) {
      const lineIndex = startRow + r;
      const line = (this.lines[lineIndex] ?? '').padEnd(cols).slice(0, cols);
      const y = contentTop + r * cellHeight;
      ctx.fillText(line, contentLeft, y);
    }

    // Cursor (blink) — underscore at exact position of next character
    this.cursorBlink = (time / 500) % 1;
    if (this.cursorBlink < 0.5) {
      const cursorRow = this.lines.length - 1 - startRow;
      if (cursorRow >= 0 && cursorRow < rows) {
        const currentLine = (this.lines[this.lines.length - 1] ?? '').padEnd(cols).slice(0, cols);
        const textBeforeCursor = currentLine.slice(0, this.cursorIndex);
        const cx = contentLeft + ctx.measureText(textBeforeCursor).width;
        const cy = contentTop + cursorRow * cellHeight;
        ctx.fillStyle = this.cursorColor;
        ctx.fillText('_', cx, cy);
      }
    }
  }

  getCanvas() {
    return this.canvas;
  }
}
