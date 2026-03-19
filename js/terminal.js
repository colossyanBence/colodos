import { getCommand, unknownCommandMessage } from './commands.js';

const SERVER_URL = 'http://localhost:8008';
const WS_URL = 'ws://localhost:8008';

export const COLOR_THEMES = [
  { name: 'Light Blue',  fg: '#add8e6', bg: '#0a0a0a', glow: '0, 160, 220' },
  { name: 'Green',       fg: '#33ff33', bg: '#0a0a0a', glow: '0, 255, 50' },
  { name: 'Amber',       fg: '#ffb000', bg: '#0a0a0a', glow: '255, 176, 0' },
  { name: 'White',       fg: '#e0e0e0', bg: '#0a0a0a', glow: '200, 200, 200' },
  { name: 'Red',         fg: '#ff4444', bg: '#0a0a0a', glow: '255, 60, 60' },
  { name: 'Magenta',     fg: '#ff66ff', bg: '#0a0a0a', glow: '255, 100, 255' },
  { name: 'Cyan',        fg: '#00e5ff', bg: '#0a0a0a', glow: '0, 229, 255' },
  { name: 'Yellow',      fg: '#ffff55', bg: '#0a0a0a', glow: '255, 255, 80' },
  { name: 'Matrix',      fg: '#00ff41', bg: '#020d00', glow: '0, 255, 65' },
];

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
    this.cursorIndex = this.prompt.length;
    this.cursorBlink = 0;

    /** @type {string[]} */
    this.history = [];
    this.historyIndex = -1;

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('2D context not available');

    const saved = parseInt(localStorage.getItem('crt_theme'), 10);
    const initial = (saved >= 0 && saved < COLOR_THEMES.length) ? saved : 0;
    this.themeIndex = initial;
    this.onThemeChange = null;
    this.fg = COLOR_THEMES[initial].fg;
    this.bg = COLOR_THEMES[initial].bg;
    this.cursorColor = COLOR_THEMES[initial].fg;
    this.fontFamily = '"Perfect DOS VGA 437", sans-serif';
    this.letterSpacing = '-0.04em';
    this.paddingX = 16;
    this.paddingY = 16;

    this.ws = null;

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

  setTheme(index) {
    if (index < 0 || index >= COLOR_THEMES.length) return;
    this.themeIndex = index;
    const theme = COLOR_THEMES[index];
    this.fg = theme.fg;
    this.bg = theme.bg;
    this.cursorColor = theme.fg;
    localStorage.setItem('crt_theme', index);
    if (this.onThemeChange) this.onThemeChange(theme);
  }

  connectWebSocket() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));
      this.ws.onclose = () => { this.ws = null; };
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'stdout') {
          const lines = msg.data.split('\n').filter(l => l !== '');
          for (const l of lines) this.lines.push(l);
          while (this.lines.length > this.rows) this.lines.shift();
        } else if (msg.type === 'stderr') {
          this._remoteHadError = true;
        } else if (msg.type === 'close') {
          if (msg.code !== 0 && this._remoteHadError) {
            this.lines.push(unknownCommandMessage);
          }
          this._remoteHadError = false;
          this.lines.push('');
          this.lines.push(this.prompt);
          this.cursorIndex = this.prompt.length;
          while (this.lines.length > this.rows) this.lines.shift();
        }
      };
    });
  }

  async executeRemote(input) {
    try {
      const resp = await fetch(`${SERVER_URL}/heartbeat`);
      if (!resp.ok) throw new Error('Server returned ' + resp.status);
      const data = await resp.json();
      if (data.status !== 'ok') throw new Error('Server status: ' + data.status);
    } catch (err) {
      this.lines.push('Your terminal proxy server is probably not running.');
      this.lines.push('');
      this.lines.push(this.prompt);
      this.cursorIndex = this.prompt.length;
      while (this.lines.length > this.rows) this.lines.shift();
      return;
    }

    try {
      await this.connectWebSocket();

      this._remoteHadError = false;
      await fetch(`${SERVER_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: input }),
      });
    } catch (err) {
      this.lines.push('Error: ' + err.message);
      this.lines.push('');
      this.lines.push(this.prompt);
      this.cursorIndex = this.prompt.length;
      while (this.lines.length > this.rows) this.lines.shift();
    }
  }

  /** Handle key down. Returns true if handled. */
  keydown(e) {
    if (e.metaKey && e.code >= 'Digit1' && e.code <= 'Digit9') {
      e.preventDefault();
      this.setTheme(parseInt(e.code[5], 10) - 1);
      return true;
    }

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
        const match = getCommand(cmd);
        if (match) {
          const result = match.handler(match.args);
          if (result.setTheme !== undefined) {
            this.setTheme(result.setTheme);
            this.lines.push(this.prompt);
            this.cursorIndex = this.prompt.length;
            while (this.lines.length > this.rows) this.lines.shift();
          } else if (result.clear) {
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
          this.executeRemote(line.trim());
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
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
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
