# CRT Shader v2 — MS-DOS Terminal

MS-DOS style terminal rendered in a **WebGL canvas** inside the browser, designed so you can apply custom fragment shaders (e.g. CRT, scanlines) to the display later.

## How it works

- **Editable terminal**: An offscreen 2D canvas is used for all text and cursor drawing (simple, robust editing).
- **WebGL display**: The visible canvas is WebGL. Each frame it samples the terminal canvas as a texture and draws it with a **passthrough fragment shader**. You can replace this shader with a CRT/scanline (or any) effect without changing the terminal logic.

## Run

```bash
npm start
```

Then open **http://localhost:3000**. (ES modules require a local server; `file://` won’t work.)

## Usage

- Click the canvas to focus, then type.
- **Enter** = new line  
- **Backspace** / **Delete** = delete  
- **Arrow keys** = move cursor  
- **Home** / **End** = start/end of line  

## Backend server

The `server/` directory contains a lightweight Node.js proxy that lets the terminal execute real shell commands on the host machine and stream their output back to the browser in real time.

- **`POST /run`** — accepts `{ "command": "..." }`, spawns the command as a child process, and streams `stdout`/`stderr` to all connected WebSocket clients. Each message is JSON with a `type` field (`stdout`, `stderr`, or `close`).
- **`GET /heartbeat`** — returns `{ status, uptime }` for health checks.
- **WebSocket (port 8008)** — clients connect via WS to receive live command output.

### Starting the server

```bash
cd server
npm install
node index.js
```

The server listens on **port 8008**. Make sure it is running before using commands that rely on backend execution in the terminal.

## Adding shaders later

1. Edit or add a fragment shader (e.g. `shaders/crt.frag`) that reads `u_texture` and `v_uv`, and outputs the final color.
2. In `main.js`, load the new shader and call `renderer.setFragmentShader(newFragSource)`.
3. The terminal texture is already in WebGL; your shader can apply curvature, scanlines, bloom, etc.
