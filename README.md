# CRT Shader v2 — MS-DOS Terminal

Editable MS-DOS style terminal rendered in a **WebGL canvas**, designed so you can apply custom fragment shaders (e.g. CRT, scanlines) to the display later.

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

## Adding shaders later

1. Edit or add a fragment shader (e.g. `shaders/crt.frag`) that reads `u_texture` and `v_uv`, and outputs the final color.
2. In `main.js`, load the new shader and call `renderer.setFragmentShader(newFragSource)`.
3. The terminal texture is already in WebGL; your shader can apply curvature, scanlines, bloom, etc.
