import { Terminal } from './terminal.js';
import { GLRenderer } from './gl-renderer.js';

async function loadShader(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.text();
}

async function main() {
  const glCanvas = document.getElementById('glcanvas');
  const container = document.getElementById('container');

  const [vertSource, fragSource] = await Promise.all([
    loadShader('shaders/crt.vert'),
    loadShader('shaders/crt.frag'),
  ]);

  const terminal = new Terminal(80, 25);
  const renderer = new GLRenderer(glCanvas, vertSource, fragSource);

  function resize() {
    // Fill viewport up to max — 80×25 gets large DOS-style character cells
    const width = Math.min(1280, window.innerWidth);
    const height = Math.min(800, window.innerHeight);
    glCanvas.width = width;
    glCanvas.height = height;
    terminal.resize(width, height);
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    const terminalFocused = !active || active === document.body || active === glCanvas;
    if (!terminalFocused) return;
    terminal.keydown(e);
  });

  glCanvas.setAttribute('tabindex', '0');
  glCanvas.focus();
  glCanvas.addEventListener('click', () => glCanvas.focus());

  function loop(time) {
    terminal.draw(time);
    renderer.render(terminal.getCanvas());
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main().catch(console.error);
