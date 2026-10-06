import type { AnaglyphSettings, Eye } from '../../model/types';
import { colorForEye, fellowEyeOf } from './anaglyph';

type Vec3 = [number, number, number];

/**
 * Shader renkleri (0–1): tembel göz tam parlaklıkta, sağlam göz `contrast` ile ölçeklenir.
 */
export function paletteToVec3(a: AnaglyphSettings, amblyopicEye: Eye, contrast: number): { amb: Vec3; fel: Vec3 } {
  const amb = colorForEye(a, amblyopicEye).map((v) => v / 255) as Vec3;
  const fel = colorForEye(a, fellowEyeOf(amblyopicEye)).map((v) => (v / 255) * contrast) as Vec3;
  return { amb, fel };
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Parlaklık hesaplanır; tembel göz rengi tam, sağlam göz rengi azaltılmış olarak uygulanır.
// Maske açıkken yavaş hareket eden lekelerde sağlam göz hiçbir şey görmez (yalnızca tembel göz).
const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec3 u_amb;
uniform vec3 u_fel;
uniform float u_mask;
uniform float u_time;
uniform float u_aspect;
varying vec2 v_uv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec3 c = texture2D(u_tex, v_uv).rgb;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float fellowVis = 1.0;
  if (u_mask > 0.5) {
    vec2 p = vec2(v_uv.x * u_aspect, v_uv.y) * 3.0 + vec2(u_time * 0.04, u_time * 0.025);
    float n = noise(p) * 0.65 + noise(p * 2.1 + 7.3) * 0.35;
    fellowVis = 1.0 - smoothstep(0.55, 0.68, n);
  }
  gl_FragColor = vec4(lum * u_amb + lum * fellowVis * u_fel, 1.0);
}`;

export interface VideoRenderer {
  render(source: TexImageSource, opts: { amb: Vec3; fel: Vec3; mask: boolean; time: number }): void;
  dispose(): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  return sh;
}

/** WebGL desteklenmiyorsa null döner. */
export function createVideoRenderer(canvas: HTMLCanvasElement): VideoRenderer | null {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false });
  if (!gl) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uAmb = u('u_amb');
  const uFel = u('u_fel');
  const uMask = u('u_mask');
  const uTime = u('u_time');
  const uAspect = u('u_aspect');

  return {
    render(source, { amb, fel, mask, time }) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      gl.uniform3fv(uAmb, amb);
      gl.uniform3fv(uFel, fel);
      gl.uniform1f(uMask, mask ? 1 : 0);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uAspect, canvas.width / Math.max(1, canvas.height));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
