import { FaceLandmarker } from '@mediapipe/tasks-vision'
import { CAMERA_MIRRORED } from './camera'
import type { FaceFrame } from './face'

// A textured 3D face mesh, drawn only while the success screen is visible.
export function createSuccessFace(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true })
  if (!gl) return { draw: (_frame: FaceFrame | undefined) => false }
  function shader(type: number, source: string) {
    const shader = gl!.createShader(type)!
    gl!.shaderSource(shader, source); gl!.compileShader(shader)
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) throw new Error('Face shader unavailable')
    return shader
  }
  const program = gl.createProgram()!
  gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec3 position; attribute vec2 uv; varying vec2 textureUV; void main(){textureUV=uv;gl_Position=vec4(position,1.0);}'))
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 textureUV; uniform sampler2D camera; void main(){gl_FragColor=texture2D(camera,textureUV);}'))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return { draw: (_frame: FaceFrame | undefined) => false }
  gl.useProgram(program)
  const connections = FaceLandmarker.FACE_LANDMARKS_TESSELATION
  const triangles: number[] = []
  for (let i = 0; i < connections.length; i += 3) {
    triangles.push(connections[i]!.start, connections[i]!.end, connections[i + 1]!.end)
  }
  // The default face surface leaves eyes and the inner mouth open. Fill these
  // loops with the camera texture so the chef's blank skin cannot show through.
  const openings = [
    [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
    [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191],
  ]
  for (const loop of openings) for (let i = 1; i < loop.length - 1; i++) triangles.push(loop[0]!, loop[i]!, loop[i + 1]!)
  const indices = new Uint16Array(triangles)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
  const vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  const position = gl.getAttribLocation(program, 'position'), uv = gl.getAttribLocation(program, 'uv')
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0)
  gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12)
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.uniform1i(gl.getUniformLocation(program, 'camera'), 0)
  const vertices = new Float32Array(468 * 5)
  let lastFrame = -1
  let smoothedFit = 0

  function draw(frame: FaceFrame | undefined) {
    if (!frame || gl!.isContextLost()) { gl!.clear(gl!.COLOR_BUFFER_BIT); lastFrame = -1; smoothedFit = 0; return false }
    if (frame.time === lastFrame) return true
    const { video, landmarks: points } = frame
    const width = video.videoWidth, height = video.videoHeight
    const eyeA = points[33]!, eyeB = points[263]!, chin = points[152]!
    const eyeX = (eyeA.x + eyeB.x) * width / 2, eyeY = (eyeA.y + eyeB.y) * height / 2
    const eyeZ = (eyeA.z + eyeB.z) * width / 2
    let roll = Math.atan2((eyeB.y - eyeA.y) * height, (eyeB.x - eyeA.x) * width)
    if (roll > Math.PI / 2) roll -= Math.PI
    if (roll < -Math.PI / 2) roll += Math.PI
    const faceWidth = Math.hypot((points[454]!.x - points[234]!.x) * width, (points[454]!.y - points[234]!.y) * height, (points[454]!.z - points[234]!.z) * width)
    const eyeChin = Math.hypot(chin.x * width - eyeX, chin.y * height - eyeY)
    const targetFit = Math.min(240 / Math.max(1, faceWidth), 158 / Math.max(1, eyeChin))
    smoothedFit = smoothedFit ? smoothedFit * .65 + targetFit * .35 : targetFit
    const fit = smoothedFit
    const cr = Math.cos(-roll), sr = Math.sin(-roll)
    const tilt = .19, ct = Math.cos(tilt), st = Math.sin(tilt)
    for (let i = 0; i < 468; i++) {
      const p = points[i]!, dx = p.x * width - eyeX, dy = p.y * height - eyeY
      const depth = p.z * width - eyeZ
      const perspective = 1 / Math.max(.75, 1 + depth / (faceWidth * 6))
      const x = (cr * dx - sr * dy) * fit * perspective * (CAMERA_MIRRORED ? -1 : 1)
      const y = (sr * dx + cr * dy) * fit * perspective
      const px = 128 + ct * x - st * y, py = 85 + st * x + ct * y
      const offset = i * 5
      vertices[offset] = px / canvas.width * 2 - 1
      vertices[offset + 1] = 1 - py / canvas.height * 2
      vertices[offset + 2] = Math.max(-.9, Math.min(.9, depth / faceWidth))
      vertices[offset + 3] = p.x; vertices[offset + 4] = p.y
    }
    gl!.viewport(0, 0, canvas.width, canvas.height)
    gl!.clearColor(0, 0, 0, 0); gl!.clear(gl!.COLOR_BUFFER_BIT)
    gl!.bindBuffer(gl!.ARRAY_BUFFER, vertexBuffer)
    gl!.bufferData(gl!.ARRAY_BUFFER, vertices, gl!.DYNAMIC_DRAW)
    gl!.bindTexture(gl!.TEXTURE_2D, texture)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, video)
    gl!.drawElements(gl!.TRIANGLES, indices.length, gl!.UNSIGNED_SHORT, 0)
    lastFrame = frame.time
    return true
  }
  return { draw }
}
