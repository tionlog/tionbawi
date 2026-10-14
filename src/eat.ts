import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import './eat.css'
import './font.css'
import { CAMERA_MIRRORED } from './camera'

type Point = { x: number; y: number }
type Mouth = Point & { width: number; angle: number; sourceX: number; sourceY: number; sourceWidth: number; lips: Point[] }
type Landmark = { x: number; y: number }

const video = document.querySelector<HTMLVideoElement>('#camera')!
video.style.transform = CAMERA_MIRRORED ? 'scaleX(-1)' : 'none'
const zoomCanvas = document.querySelector<HTMLCanvasElement>('#mouth-zoom')!
const zoomContext = zoomCanvas.getContext('2d')!
const bread = document.querySelector<HTMLImageElement>('#flying-bread')!
const crumbs = document.querySelector<HTMLDivElement>('#crumbs')!
const status = document.querySelector<HTMLParagraphElement>('#camera-status')!
const lipOutline = [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91]
const crumbSizes = [2.8, 5, 3.2, 2, 4.1, 6, 2.4, 4.8, 3, 5.6, 2.2, 4]
const crumbNodes = lipOutline.map((_, index) => {
  const crumb = document.createElement('i')
  crumb.className = 'crumb'
  crumb.style.setProperty('--i', String(index))
  crumbs.append(crumb)
  return crumb
})

let stream: MediaStream | undefined
let landmarker: FaceLandmarker | undefined
let frame = 0
let lastDetection = 0
let lastVideoTime = -1
let lastFaceAt = 0
let mouth: Mouth | undefined
let openness = 0
let zoom = 0
let openFrames = 0
let phase: 'waiting' | 'flying' = 'waiting'
let hasEaten = false
let mouthOpen = false
let nextBreadAt = 0
let flightStart = 0
let flightFrom: Point = { x: 0, y: 0 }
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')

function resizeCanvas() {
  const ratio = Math.min(devicePixelRatio || 1, 1.5)
  zoomCanvas.width = Math.round(innerWidth * ratio)
  zoomCanvas.height = Math.round(innerHeight * ratio)
  zoomContext.setTransform(ratio, 0, 0, ratio, 0, 0)
}

function screenPoint(point: Landmark): Point {
  const scale = Math.max(innerWidth / video.videoWidth, innerHeight / video.videoHeight)
  const imageWidth = video.videoWidth * scale
  const imageHeight = video.videoHeight * scale
  const offsetX = (innerWidth - imageWidth) / 2
  const offsetY = (innerHeight - imageHeight) / 2
  const x = point.x * imageWidth + offsetX
  return { x: CAMERA_MIRRORED ? innerWidth - x : x, y: point.y * imageHeight + offsetY }
}

function distance(a: Landmark, b: Landmark) {
  return Math.hypot((a.x - b.x) * video.videoWidth, (a.y - b.y) * video.videoHeight)
}

function updateMouth(landmarks: Landmark[], now: number, jawOpen?: number) {
  const left = landmarks[61]!, right = landmarks[291]!
  const upper = landmarks[13]!, lower = landmarks[14]!
  const sourceX = (upper.x + lower.x) / 2 * video.videoWidth
  const sourceY = (upper.y + lower.y) / 2 * video.videoHeight
  const center = screenPoint({ x: sourceX / video.videoWidth, y: sourceY / video.videoHeight })
  const screenLeft = screenPoint(left), screenRight = screenPoint(right)
  const width = Math.hypot(screenRight.x - screenLeft.x, screenRight.y - screenLeft.y)
  mouth = {
    ...center,
    width: Math.max(25, width),
    angle: Math.atan2(screenRight.y - screenLeft.y, screenRight.x - screenLeft.x),
    sourceX, sourceY, sourceWidth: Math.max(15, distance(left, right)),
    lips: lipOutline.map(index => screenPoint(landmarks[index]!)),
  }
  lastFaceAt = now
  openness = distance(upper, lower) / Math.max(1, distance(left, right))
  if (openness > .26 || (jawOpen ?? 0) > .18) { openFrames++; if (openFrames >= 2) mouthOpen = true }
  else if (openness < .24 && (jawOpen ?? 0) < .13) { openFrames = 0; mouthOpen = false }
  if (!mouthOpen && phase === 'flying') {
    hasEaten = true; phase = 'waiting'; bread.hidden = true
  }
  if (mouthOpen && phase === 'waiting' && now >= nextBreadAt) startFlight(now)
}

function startFlight(now: number) {
  phase = 'flying'
  flightStart = now
  bread.hidden = false
  const halfBread = bread.offsetWidth / 2
  flightFrom = { x: Math.min(innerWidth * .83, innerWidth - halfBread - 16), y: Math.min(innerHeight * .76, innerHeight - halfBread - 16) }
}

function drawZoom() {
  zoomContext.clearRect(0, 0, innerWidth, innerHeight)
  if (!mouth || zoom < .04 || !video.videoWidth || performance.now() - lastFaceAt > 550) return
  const radiusX = Math.max(34, Math.min(innerWidth * .44, mouth.width * (.58 + zoom * .37)))
  const radiusY = radiusX * .62
  const sourceWidth = mouth.sourceWidth * 1.3
  const sourceHeight = sourceWidth * radiusY / radiusX
  const sourceX = Math.max(0, Math.min(video.videoWidth - sourceWidth, mouth.sourceX - sourceWidth / 2))
  const sourceY = Math.max(0, Math.min(video.videoHeight - sourceHeight, mouth.sourceY - sourceHeight / 2))

  zoomContext.save()
  zoomContext.globalAlpha = Math.min(1, zoom * 1.25)
  zoomContext.beginPath()
  zoomContext.ellipse(mouth.x, mouth.y, radiusX, radiusY, mouth.angle, 0, Math.PI * 2)
  zoomContext.clip()
  zoomContext.translate(mouth.x + (CAMERA_MIRRORED ? radiusX : -radiusX), mouth.y - radiusY)
  if (CAMERA_MIRRORED) zoomContext.scale(-1, 1)
  zoomContext.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, radiusX * 2, radiusY * 2)
  zoomContext.restore()

  // Soften the edge where the enlarged mouth meets the live camera image.
  zoomContext.save()
  zoomContext.globalCompositeOperation = 'destination-in'
  zoomContext.translate(mouth.x, mouth.y)
  zoomContext.rotate(mouth.angle)
  zoomContext.scale(1, radiusY / radiusX)
  const fade = zoomContext.createRadialGradient(0, 0, radiusX * .72, 0, 0, radiusX)
  fade.addColorStop(0, '#000')
  fade.addColorStop(1, '#0000')
  zoomContext.fillStyle = fade
  zoomContext.beginPath()
  zoomContext.arc(0, 0, radiusX, 0, Math.PI * 2)
  zoomContext.fill()
  zoomContext.restore()
}

function updateCrumbs(now: number) {
  const visible = hasEaten && !mouthOpen && mouth && now - lastFaceAt < 550
  crumbs.hidden = !visible
  if (!visible || !mouth) return
  crumbs.style.left = `${mouth.x}px`
  crumbs.style.top = `${mouth.y}px`
  crumbs.style.transform = 'none'
  crumbNodes.forEach((node, index) => {
    const lip = mouth!.lips[index]!
    const dx = lip.x - mouth!.x, dy = lip.y - mouth!.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const offset = Math.min(4, mouth!.width * .018)
    const size = Math.max(2, Math.min(9, crumbSizes[index]! * mouth!.width / 100))
    node.style.width = `${size}px`
    node.style.height = `${size * (.65 + (index % 3) * .12)}px`
    node.style.transform = `translate(${dx + dx / length * offset - size / 2}px, ${dy + dy / length * offset - size / 2}px) rotate(${index * 31}deg)`
  })
}

function updateBread(now: number) {
  if (phase !== 'flying' || !mouth) return
  const duration = reducedMotion.matches ? 650 : 1450
  const t = Math.min(1, (now - flightStart) / duration)
  const remaining = 1 - t
  const controlX = (flightFrom.x + mouth.x) / 2 - Math.min(85, innerWidth * .12)
  const controlY = Math.min(flightFrom.y, mouth.y) - Math.min(130, innerHeight * .16)
  const x = remaining * remaining * flightFrom.x + 2 * remaining * t * controlX + t * t * mouth.x
  const y = remaining * remaining * flightFrom.y + 2 * remaining * t * controlY + t * t * mouth.y
  const scale = Math.max(.035, Math.pow(remaining, 1.3))
  bread.style.left = `${x}px`
  bread.style.top = `${y}px`
  bread.style.opacity = String(Math.min(1, remaining * 13))
  bread.style.transform = `translate(-50%, -50%) rotate(${t * (reducedMotion.matches ? 180 : 900)}deg) scale(${scale})`
  if (t >= 1) { hasEaten = true; phase = 'waiting'; bread.hidden = true; nextBreadAt = now + 350 }
}

function loop(now: number) {
  frame = requestAnimationFrame(loop)
  if (document.hidden || !landmarker || video.readyState < 2) return
  if (now - lastDetection > 85 && video.currentTime !== lastVideoTime) {
    lastDetection = now
    lastVideoTime = video.currentTime
    try {
      const result = landmarker.detectForVideo(video, now)
      const landmarks = result.faceLandmarks[0]
      if (landmarks && [13, 14, 61, 291].every(index => {
        const point = landmarks[index]
        return point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
      })) {
        const jawOpen = result.faceBlendshapes[0]?.categories.find(category => category.categoryName === 'jawOpen')?.score
        updateMouth(landmarks, now, jawOpen)
        document.body.classList.add('camera-ready')
      }
      else { openness = 0; openFrames = 0; mouthOpen = false }
    } catch { /* Ignore a dropped video frame and keep the camera running. */ }
  }
  if (now - lastFaceAt > 550) {
    document.body.classList.remove('camera-ready')
    if (phase === 'flying') { phase = 'waiting'; bread.hidden = true; openFrames = 0 }
  }
  const targetZoom = mouthOpen ? Math.max(0, Math.min(1, (openness - .045) / .13)) : 0
  zoom += (targetZoom - zoom) * .22
  if (now - lastFaceAt > 550) zoom *= .8
  drawZoom()
  updateBread(now)
  updateCrumbs(now)
}

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('카메라는 localhost 또는 HTTPS 주소에서 사용할 수 있어요.')
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false })
    video.srcObject = stream
    await video.play()
    status.hidden = true
    resizeCanvas()
    const base = import.meta.env.BASE_URL
    const files = await FilesetResolver.forVisionTasks(`${base}models/wasm`)
    landmarker = await FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${base}models/face_landmarker.task`, delegate: 'CPU' },
      canvas: document.createElement('canvas'), runningMode: 'VIDEO', numFaces: 1, minTrackingConfidence: .5, outputFaceBlendshapes: true,
    })
    frame = requestAnimationFrame(loop)
  } catch (error) {
    const cameraOpened = video.readyState >= 2
    stream?.getTracks().forEach(track => track.stop())
    stream = undefined
    video.srcObject = null
    status.textContent = cameraOpened
      ? '얼굴 인식을 준비하지 못했어요. 페이지를 다시 열어주세요.'
      : error instanceof Error && error.name === 'NotAllowedError'
      ? '카메라 접근을 허용해주세요.'
      : error instanceof Error ? error.message : '카메라를 열 수 없어요.'
    status.hidden = false
  }
}

window.addEventListener('resize', resizeCanvas)
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(frame)
  landmarker?.close()
  stream?.getTracks().forEach(track => track.stop())
})
void startCamera()
