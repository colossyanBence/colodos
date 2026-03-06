precision mediump float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv - 0.5;
  float r = length(uv);
  float r2 = r * r;
  float barrel = 0.15;
  float f = 1.0 + barrel * r2;
  vec2 uvDistorted = 0.5 + uv * f;
  vec2 uvSample = vec2(uvDistorted.x, 1.0 - uvDistorted.y);

  float chromaOffset = 0.002;
  vec2 dir = normalize(uv + 0.001);
  float rR = texture2D(uTexture, uvSample - dir * chromaOffset).r;
  float g = texture2D(uTexture, uvSample).g;
  float bB = texture2D(uTexture, uvSample + dir * chromaOffset).b;
  vec3 color = vec3(rR, g, bB);

  float scanline = 1.0 - 0.28 * mod(floor(vUv.y * uResolution.y), 2.0);
  color *= scanline;

  float vignette = 1.0 - 0.4 * r * 2.0;
  color *= vignette;

  // Glare: soft reflection from top-right (light on screen)
  vec2 glareCenter = vec2(0.75, 0.25);
  float glareDist = length(vUv - glareCenter);
  float glare = 0.35 * exp(-glareDist * 2.8);
  color += vec3(glare * 0.15, glare * 0.18, glare * 0.12);

  if (uvDistorted.x < 0.0 || uvDistorted.x > 1.0 || uvDistorted.y < 0.0 || uvDistorted.y > 1.0) {
    color = vec3(0.0, 0.0, 0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
