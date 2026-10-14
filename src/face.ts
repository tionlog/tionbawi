import { FaceLandmarker, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

const size = 256
const faceTimeout = 450
const jawOutline = [127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356]
export type FaceFrame = { video: HTMLVideoElement; landmarks: { x: number; y: number; z: number }[]; time: number }
export type FaceTracker = { start: () => Promise<void>; stop: () => void; getFaceFrame: () => FaceFrame | undefined; getActive: () => boolean }

export function createFaceTracker(video: HTMLVideoElement, canvas: HTMLCanvasElement, onStatus: (message: string) => void, onTracking: (visible: boolean) => void): FaceTracker {
  const output = canvas.getContext('2d', { alpha: true })!
  const source = document.createElement('canvas')
  source.width = source.height = size
  const sourceContext = source.getContext('2d', { willReadFrequently: true })!
  let stream: MediaStream | undefined
  let landmarker: FaceLandmarker | undefined
  let segmenter: ImageSegmenter | undefined
  let active = false
  let tracked = false
  let loading: Promise<void> | undefined
  let generation = 0
  let frame = 0
  let lastRun = 0
  let lastVideoTime = -1
  let lastFaceSeen = 0
  let lastSegment = 0
  let smoothWidth = 0
  let smoothHeight = 0
  let smoothAngle = 0
  let cachedMask: { values: Uint8Array; width: number; height: number } | undefined
  let faceFrame: FaceFrame | undefined

  function setTracked(visible: boolean) {
    if (tracked === visible) return
    tracked = visible
    if (!visible) {
      output.clearRect(0, 0, canvas.width, canvas.height)
      cachedMask = undefined
      smoothWidth = 0
      smoothHeight = 0
      faceFrame = undefined
    }
    onTracking(visible)
  }

  function valid(points: { x: number; y: number }[], width: number, height: number) {
    if (width < 2 || height < 2) return false
    if (![1, 33, 263, ...jawOutline].every(index => {
      const point = points[index]
      return point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= -.05 && point.x <= 1.05 && point.y >= -.05 && point.y <= 1.05
    })) return false
    const left = points[234]!, right = points[454]!, eyeA = points[33]!, eyeB = points[263]!
    const faceWidth = Math.hypot((right.x - left.x) * width, (right.y - left.y) * height)
    const eyeWidth = Math.hypot((eyeB.x - eyeA.x) * width, (eyeB.y - eyeA.y) * height)
    const minSide = Math.min(width, height)
    return faceWidth >= Math.max(16, minSide * .07) && eyeWidth >= Math.max(8, minSide * .03) && faceWidth <= width * 1.05
  }

  async function prepare() {
    const { BASE_URL } = import.meta.env
    const files = await FilesetResolver.forVisionTasks(`${BASE_URL}models/wasm`)
    return FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${BASE_URL}models/face_landmarker.task`, delegate: 'CPU' },
      canvas: document.createElement('canvas'),
      runningMode: 'VIDEO', numFaces: 1, minTrackingConfidence: 0.5,
    })
  }

  function render(now: number) {
    if (!active) return
    frame = requestAnimationFrame(render)
    if (tracked && now - lastFaceSeen > faceTimeout) setTracked(false)
    if (document.hidden || !landmarker || video.readyState < 2 || now - lastRun < 85 || video.currentTime === lastVideoTime) return
    lastRun = now
    lastVideoTime = video.currentTime
    try {
      const landmarks = landmarker.detectForVideo(video, now).faceLandmarks[0]
      const videoWidth = video.videoWidth, videoHeight = video.videoHeight
      if (!landmarks || !valid(landmarks, videoWidth, videoHeight)) return
      const leftEye = landmarks[33]!, rightEye = landmarks[263]!
      const left = landmarks[234]!, right = landmarks[454]!, chin = landmarks[152]!
      const eyeVideoX = (leftEye.x + rightEye.x) * videoWidth / 2
      const eyeVideoY = (leftEye.y + rightEye.y) * videoHeight / 2
      const faceWidth = Math.hypot((right.x - left.x) * videoWidth, (right.y - left.y) * videoHeight)
      const faceHeight = Math.hypot((chin.x - (leftEye.x + rightEye.x) / 2) * videoWidth, (chin.y - (leftEye.y + rightEye.y) / 2) * videoHeight)
      const cropSide = Math.max(faceWidth * 1.55, faceHeight * 2.15)
      const cropX = eyeVideoX - cropSide * .5
      const cropY = eyeVideoY - cropSide * .35
      // Preserve the camera's aspect ratio before aligning the eyes with the hat.
      sourceContext.clearRect(0, 0, size, size)
      sourceContext.drawImage(video, -cropX * size / cropSide, -cropY * size / cropSide, videoWidth * size / cropSide, videoHeight * size / cropSide)
      if (segmenter && now - lastSegment > 180) {
        const result = segmenter.segmentForVideo(video, now)
        const mask = result.categoryMask
        cachedMask = mask ? { values: new Uint8Array(mask.getAsUint8Array()), width: mask.width, height: mask.height } : undefined
        result.close()
        lastSegment = now
      }
      if (cachedMask) {
        const image = sourceContext.getImageData(0, 0, size, size)
        const { values, width: mw, height: mh } = cachedMask
        const nose = landmarks[1]!
        const personLabel = values[Math.min(mh - 1, Math.max(0, Math.floor(nose.y * mh))) * mw + Math.min(mw - 1, Math.max(0, Math.floor(nose.x * mw)))]
        // Use a confirmed person mask; otherwise the fitted face outline is safer
        // than accidentally selecting the background as the foreground.
        if (personLabel === 1) {
          for (let y = 0; y < size; y++) {
            const sourceY = cropY + (y + .5) * cropSide / size
            const maskY = Math.floor(sourceY / videoHeight * mh)
            for (let x = 0; x < size; x++) {
              const i = y * size + x
              const sourceX = cropX + (x + .5) * cropSide / size
              const maskX = Math.floor(sourceX / videoWidth * mw)
              const inside = maskX >= 0 && maskX < mw && maskY >= 0 && maskY < mh
              if (!inside || values[maskY * mw + maskX] !== 1) image.data[i * 4 + 3] = 0
            }
          }
          sourceContext.putImageData(image, 0, 0)
        } else {
          cachedMask = undefined
        }
      }
      smoothWidth = smoothWidth ? smoothWidth * .65 + faceWidth * .35 : faceWidth
      smoothHeight = smoothHeight ? smoothHeight * .65 + faceHeight * .35 : faceHeight
      let angle = Math.atan2((rightEye.y - leftEye.y) * videoHeight, (rightEye.x - leftEye.x) * videoWidth)
      if (angle > Math.PI / 2) angle -= Math.PI
      if (angle < -Math.PI / 2) angle += Math.PI
      smoothAngle = tracked ? smoothAngle * .65 + angle * .35 : angle
      // Fit both the temples and the chin: keep natural proportions and leave
      // forehead/hair above the eyes for the foreground hat brim to cover.
      const fit = Math.min(214 / smoothWidth, 102 / smoothHeight)
      const scale = Math.min(3.5, Math.max(.7, fit * cropSide / size))
      const cos = Math.cos(-smoothAngle) * scale, sin = Math.sin(-smoothAngle) * scale
      const eyeX = (eyeVideoX - cropX) * size / cropSide
      const eyeY = (eyeVideoY - cropY) * size / cropSide
      const contour = jawOutline.map(index => {
        const point = landmarks[index]!
        const x = (point.x * videoWidth - cropX) * size / cropSide - eyeX
        const y = (point.y * videoHeight - cropY) * size / cropSide - eyeY
        return { x: 128 + cos * x - sin * y, y: 99 + sin * x + cos * y }
      })
      output.clearRect(0, 0, canvas.width, canvas.height)
      output.save()
      output.beginPath()
      // Preserve hair under the hat, then follow the actual cheeks and jaw.
      output.moveTo(contour[0]!.x, 0)
      for (const point of contour) output.lineTo(point.x, point.y)
      output.lineTo(contour[contour.length - 1]!.x, 0)
      output.closePath()
      output.clip()
      output.setTransform(cos, sin, -sin, cos, 128 - cos * eyeX + sin * eyeY, 99 - sin * eyeX - cos * eyeY)
      output.drawImage(source, 0, 0)
      output.restore()
      if (output.getImageData(128, 118, 1, 1).data[3] < 40) return
      lastFaceSeen = now
      faceFrame = { video, landmarks, time: now }
      setTracked(true)
    } catch { /* Keep the last good frame when a camera frame is dropped. */ }
  }

  async function start() {
    if (active || loading) return loading
    const token = ++generation
    const task = (async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('카메라는 localhost 또는 HTTPS 주소에서 사용할 수 있어요.')
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }, audio: false })
      if (token !== generation) { nextStream.getTracks().forEach(track => track.stop()); return }
      stream = nextStream
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (token !== generation) return
        stop()
        onStatus('카메라 연결이 끊어졌어요. 얼굴 보기 버튼으로 다시 시도해주세요.')
      })
      video.srcObject = stream
      await video.play()
      if (token !== generation) return
      onStatus('얼굴을 인식하는 중이에요…')
      const model = await prepare()
      if (token !== generation) { model.close(); return }
      landmarker = model
      active = true
      lastFaceSeen = performance.now()
      frame = requestAnimationFrame(render)
      onStatus('')
      // Initialise segmentation only after the face model is ready.
      window.setTimeout(() => {
        if (!active || token !== generation) return
        void (async () => {
          const files = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}models/wasm`)
          const model = await ImageSegmenter.createFromOptions(files, {
            baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/selfie_segmenter.tflite`, delegate: 'CPU' },
            canvas: document.createElement('canvas'),
            runningMode: 'VIDEO', outputCategoryMask: true, outputConfidenceMasks: false,
          })
          if (active && token === generation) segmenter = model
          else model.close()
        })().catch(() => { /* The face cutout still works without the optional person mask. */ })
      }, 700)
    })()
    const result = task.catch(error => { if (token === generation) { stop(); throw error } }).finally(() => { if (loading === result) loading = undefined })
    loading = result
    return result
  }
  function stop() {
    generation++
    active = false
    setTracked(false)
    cachedMask = undefined
    cancelAnimationFrame(frame)
    stream?.getTracks().forEach(track => track.stop())
    stream = undefined
    video.srcObject = null
    output.clearRect(0, 0, canvas.width, canvas.height)
    landmarker?.close(); segmenter?.close(); landmarker = undefined; segmenter = undefined
    lastVideoTime = -1
  }
  return { start, stop, getFaceFrame: () => tracked ? faceFrame : undefined, getActive: () => active }
}
