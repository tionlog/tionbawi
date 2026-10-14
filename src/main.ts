import './style.css'
import './font.css'
import { createFaceTracker } from './face'
import { createSuccessFace } from './success-face'
import { CAMERA_MIRRORED } from './camera'
import { addComment, commentsReady, listComments, type Comment } from './comments'
import { endAllScenarios, endScenario, startScenario, trackEvent } from './analytics'

const base = import.meta.env.BASE_URL
const lidPath = 'M470 730 L471 713 Q461 692 484 691 Q508 693 495 714 L497 730 Q584 741 612 851 Q615 859 607 865 Q490 887 357 861 Q353 857 357 844 Q373 746 470 730 Z'
// Follow the lower edge of the brim so it overlaps the forehead, not the eyes.
const hatPath = 'M280 40 H745 V330 L641 402 Q506 355 366 402 L350 330 H280 Z'
const centers = [205, 512, 819]
const asset = (path: string) => `${base}${path}`
const cupsMarkup = centers.map((x, i) => `<g class="cup" data-cup="${i}" tabindex="-1" role="button" aria-label="${i + 1}번 덮개 선택" style="transform:translate3d(${x - 487}px,0,0)">
  <ellipse cx="487" cy="888" rx="151" ry="19" fill="#4c514c" opacity=".14"/>
  <ellipse cx="487" cy="879" rx="153" ry="23" fill="url(#plate-metal)"/>
  <ellipse cx="487" cy="872" rx="142" ry="16" fill="url(#plate-inside)"/>
  ${i === 1 ? `<ellipse class="bread-shadow" cx="487" cy="867" rx="73" ry="10" fill="#66513a" opacity=".22"/><image class="bread" href="${asset('salt-bread.png')}" x="398" y="771" width="178" height="119"/>` : ''}
  <g class="lid ${i === 1 ? 'lid-open' : ''}"><image href="${asset('chef.png')}" width="1024" height="1024" clip-path="url(#lid-mask)"/><path class="cup-outline" d="${lidPath}" fill="transparent" stroke="white" stroke-width="7"/></g>
 </g>`).join('')

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main class="journey"><section class="viewport" data-phase="home" aria-label="요리사 야바위">
 <div class="scene"><div class="artwork">
  <svg viewBox="0 0 1024 1024" role="img" aria-label="폭신한 요리사 옷과 은색 덮개 세 개" class="chef-image">
   <defs>
    
    <clipPath id="hat-mask"><path d="${hatPath}"/></clipPath>
    <clipPath id="lid-mask"><path d="${lidPath}"/></clipPath>
    <linearGradient id="plate-metal" x2="0" y2="1"><stop stop-color="#f9faf8"/><stop offset=".45" stop-color="#959d99"/><stop offset=".7" stop-color="#e9eeeb"/><stop offset="1" stop-color="#6c7671"/></linearGradient>
    <radialGradient id="plate-inside"><stop stop-color="#f0f1eb"/><stop offset=".8" stop-color="#c5cbc5"/><stop offset="1" stop-color="#f9fcf8"/></radialGradient>
   </defs>
   <image href="${asset('chef-stage-face.png')}" width="1024" height="1024"/>
   <image class="camera-base" href="${asset('chef-stage.png')}" width="1024" height="1024"/>
   ${cupsMarkup}
  </svg>
  <div class="face"><video autoplay muted playsinline aria-hidden="true"></video><canvas width="256" height="274" aria-label="추적 중인 내 얼굴"></canvas></div>
  <svg class="hat-image" viewBox="0 0 1024 1024" aria-hidden="true"><image href="${asset('chef-stage.png')}" width="1024" height="1024" clip-path="url(#hat-mask)"/></svg>
  <button class="lucky-letter" type="button" aria-label="행운의 편지 열고 코멘트 쓰기" hidden><img src="${asset('lucky-letter.png')}" alt="행운의 편지" draggable="false"></button>
  <div class="shuffle-area" tabindex="0" role="button" aria-label="덮개를 비비거나 Enter 또는 스페이스 키를 눌러 섞기"><i class="motion-line"></i><i class="motion-line"></i><span class="whoosh-label" aria-hidden="true">휙휙</span></div>
 </div></div>
 <div class="actions">
  <div class="action-wrap"><p class="cloud-hint" id="shuffle-hint" hidden>그릇을 비벼봐 . . .</p><div class="cloud-action primary" tabindex="0" aria-describedby="shuffle-hint"><span>섞기!</span></div></div>
  <div class="action-wrap"><p class="cloud-hint" id="face-hint" hidden>화면을 천천히 올려봐 . . 아는 사람일 테니.</p><div class="cloud-action secondary" tabindex="0" aria-describedby="face-hint"><span>야바위꾼 얼굴 좀 보자!</span></div></div>
 </div>
 <p class="pick-prompt bubble" hidden>하나만 골라보시오</p>
 <div class="result-panel" hidden><h1 class="result-title"></h1><button class="restart" type="button">다시할래</button></div>
 <section class="success-screen" hidden aria-label="성공 화면">
  <div class="success-card"><h1>성공!</h1><p>맛있게 먹어~</p><div class="success-actions"><button class="play-again" type="button">한판 더~</button><button class="eat-bread" type="button">맛있게 먹기 (입 벌리고 준비) →</button></div></div>
  <div class="success-figure"><img class="success-default" src="${asset('success.png')}" alt="의기양양한 요리사가 소금빵 접시를 내민 모습"><img class="success-stage" src="${asset('success-stage.png')}" alt=""><canvas class="success-face" width="256" height="274" aria-label="요리사 얼굴에 합성된 내 모습"></canvas><img class="success-hat" src="${asset('success-stage.png')}" alt=""><img class="success-bread" src="${asset('salt-bread.png')}" alt="접시에 놓인 소금빵"></div>
 </section>
 <section class="comment-panel" hidden aria-label="코멘트 남기기"><h2>코멘트 남기기</h2><form class="comment-form"><label class="message-field"><span class="sr-only">하고 싶은 말</span><textarea name="message" maxlength="300" placeholder="야바위 푸드로 마라샹궈도 추가 부탁해~" required></textarea></label><label class="name-field">From. <input name="name" maxlength="30" placeholder="이름" required></label><button type="submit" class="send">~전송~</button><p class="form-status" role="status"></p></form></section>
</section></main>
<section class="comments-section" hidden><h2>다른 실패자들의 코멘트 . .</h2><div class="comments-list"></div><p class="comments-status" role="status"></p></section>`

const get = <T extends Element>(selector: string) => document.querySelector<T>(selector)!
const viewport = get<HTMLElement>('.viewport')
const scene = get<HTMLDivElement>('.scene')
const artwork = get<HTMLDivElement>('.artwork')
const actions = get<HTMLDivElement>('.actions')
const face = get<HTMLDivElement>('.face')
const faceHint = get<HTMLParagraphElement>('#face-hint')
const shuffleHint = get<HTMLParagraphElement>('#shuffle-hint')
const area = get<HTMLDivElement>('.shuffle-area')
const cups = [...document.querySelectorAll<SVGGElement>('.cup')]
const bread = get<SVGImageElement>('.bread')
const breadShadow = get<SVGEllipseElement>('.bread-shadow')
const resultPanel = get<HTMLDivElement>('.result-panel')
const successScreen = get<HTMLElement>('.success-screen')
const successFigure = get<HTMLElement>('.success-figure')
const successFace = get<HTMLCanvasElement>('.success-face')
const commentPanel = get<HTMLElement>('.comment-panel')
const commentSection = get<HTMLElement>('.comments-section')
const pickPrompt = get<HTMLParagraphElement>('.pick-prompt')
const luckyLetter = get<HTMLButtonElement>('.lucky-letter')
const video = get<HTMLVideoElement>('.face video')
const faceCanvas = get<HTMLCanvasElement>('.face canvas')
faceCanvas.style.transform = CAMERA_MIRRORED ? 'scaleX(-1)' : 'none'
let phase: 'home' | 'shuffling' | 'choose' | 'failure' | 'success' = 'home'
let attempts = Number(sessionStorage.getItem('suhsih-attempts') || '0')
let cameraAttempted = false
let cameraLoading = false
const tracker = createFaceTracker(video, faceCanvas, () => {}, visible => {
  artwork.classList.toggle('camera-ready', visible)
})

async function startCamera() {
  if (cameraLoading || tracker.getActive()) return
  cameraAttempted = true
  cameraLoading = true
  try { await tracker.start(); if (tracker.getActive()) trackEvent('camera_ready', { screen: 'game' }) }
  catch { trackEvent('camera_unavailable', { screen: 'game' }) }
  finally { cameraLoading = false }
}
for (const [selector, hint] of [['.primary', shuffleHint], ['.secondary', faceHint]] as const) {
  const cloud = get<HTMLElement>(selector)
  cloud.addEventListener('pointerenter', () => { if (phase === 'home') hint.hidden = false })
  cloud.addEventListener('pointerleave', () => { hint.hidden = true })
  cloud.addEventListener('focus', () => { if (phase === 'home') hint.hidden = false })
  cloud.addEventListener('blur', () => { hint.hidden = true })
}

let viewHeight = 1, homeSize = 1, faceSize = 1, homeTop = 0, faceTop = 0, actionTop = 0, layoutFrame = 0
function measure() {
  const width = viewport.clientWidth
  viewHeight = viewport.clientHeight
  const space = Math.max(210, viewHeight - 125)
  homeSize = Math.min(width * 1.08, space / .43, 1440)
  faceSize = Math.min(width * .96, (viewHeight - 38) / 1.13, 900)
  const mobileOffset = width < 600 ? Math.max(36, (viewHeight - homeSize * .43 - 150) / 2) : 0
  homeTop = -homeSize * .535 + mobileOffset
  actionTop = width < 600 ? mobileOffset + homeSize * .43 + 36 : viewHeight - 94
  actions.style.top = `${actionTop}px`
  faceTop = (viewHeight - faceSize * 1.13) / 2 + faceSize * .13
  artwork.style.width = `${homeSize}px`
  scheduleLayout()
}
function renderLayout() {
  layoutFrame = 0
  const progress = phase === 'choose' || phase === 'failure' || phase === 'success' ? 1 : Math.min(1, Math.max(0, window.scrollY / (viewHeight * .6)))
  if ((phase === 'home' || phase === 'shuffling') && progress > .55) startScenario('face_view')
  else endScenario('face_view', phase === 'home' || phase === 'shuffling' ? 'scroll_back' : 'next_stage')
  const size = homeSize + (faceSize - homeSize) * progress
  const top = homeTop + (faceTop - homeTop) * progress
  artwork.style.transform = `translate3d(-50%, ${top}px, 0) scale(${size / homeSize})`
  const cropTop = Math.max(0, homeTop + homeSize * .54) * (1 - progress)
  scene.style.clipPath = `inset(${cropTop}px 0 0)`
  face.style.opacity = String(progress)
  if (phase === 'choose') {
    const rect = artwork.getBoundingClientRect()
    const headX = rect.left + rect.width * .5, headY = rect.top + rect.height * .435
    const promptWidth = pickPrompt.offsetWidth, promptHeight = pickPrompt.offsetHeight
    const left = Math.min(viewport.clientWidth - promptWidth - 16, headX + rect.width * .16)
    const top = Math.max(12, headY - promptHeight / 2)
    pickPrompt.style.left = `${left}px`; pickPrompt.style.top = `${top}px`
    pickPrompt.style.setProperty('--tail-angle', `${Math.atan2(headY - top - promptHeight / 2, headX - left) - Math.PI}rad`)
  }
  actions.style.transform = `translate3d(-50%, ${(viewHeight - actionTop + 20) * progress}px, 0)`
  actions.inert = progress > .85 || phase !== 'home'
  if (progress > .55 && !cameraAttempted) void startCamera()
}
function scheduleLayout() { if (!layoutFrame) layoutFrame = requestAnimationFrame(renderLayout) }
window.addEventListener('scroll', scheduleLayout, { passive: true })
window.addEventListener('resize', measure)
measure()
startScenario('home')

let audioContext: AudioContext | undefined
let noiseBuffer: AudioBuffer | undefined
let lastWhoosh = 0
let audioAvailable = true
let recordedAudioPlaying = false
const audio = new Audio(asset('audio/shuffle.mp3'))
audio.preload = 'auto'; audio.loop = true
audio.addEventListener('playing', () => { recordedAudioPlaying = true })
audio.addEventListener('pause', () => { recordedAudioPlaying = false })
audio.addEventListener('error', () => { audioAvailable = false; recordedAudioPlaying = false })
function unlockAudio() {
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') void audioContext.resume().then(() => {
    if (phase === 'shuffling' && performance.now() >= closingUntil) whoosh(performance.now())
  }).catch(() => {})
}
// A trusted touch/click also unlocks sound if the browser blocks initial hover audio.
window.addEventListener('pointerdown', unlockAudio, { capture: true })
window.addEventListener('pointerup', unlockAudio, { capture: true })
window.addEventListener('touchend', unlockAudio, { capture: true, passive: true })
window.addEventListener('click', unlockAudio, { capture: true })
window.addEventListener('keydown', unlockAudio, { capture: true })
function whoosh(now: number) {
  if (!audioContext || audioContext.state !== 'running' || recordedAudioPlaying || now - lastWhoosh < 140) return
  lastWhoosh = now
  if (!noiseBuffer) {
    noiseBuffer = audioContext.createBuffer(1, Math.round(audioContext.sampleRate * .13), audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain()
  source.buffer = noiseBuffer; filter.type = 'bandpass'; filter.frequency.value = 1400
  gain.gain.setValueAtTime(.001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(.1, audioContext.currentTime + .03)
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .13)
  source.connect(filter).connect(gain).connect(audioContext.destination); source.start()
}

let shuffleFrame = 0, shuffleEnd = 0, closingUntil = 0, previousFrame = 0, shufflePhase = 0
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
function showBread(visible: boolean) {
  bread.style.opacity = visible ? '1' : '0'
  breadShadow.style.opacity = visible ? '.22' : '0'
}
function settleCups() {
  cancelAnimationFrame(shuffleFrame); shuffleFrame = 0; audio.pause()
  area.classList.remove('shuffling')
  const slots = [0, 1, 2]
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j]!, slots[i]!]
  }
  cups.forEach((cup, index) => { cup.style.transform = `translate3d(${centers[slots[index]!]! - 487}px, 0, 0)` })
  window.setTimeout(() => {
    if (phase !== 'shuffling') return
    endScenario('shuffle', 'completed')
    phase = 'choose'; viewport.dataset.phase = phase
    startScenario('choose')
    pickPrompt.hidden = false
    scheduleLayout()
    cups.forEach(cup => cup.setAttribute('tabindex', '0'))
    window.scrollTo({ top: viewHeight * .6, behavior: reducedMotion.matches ? 'instant' : 'smooth' })
  }, reducedMotion.matches ? 0 : 420)
}
function animateShuffle(now: number) {
  if (phase !== 'shuffling' || document.hidden) { settleCups(); return }
  if (now >= shuffleEnd) { settleCups(); return }
  if (now >= closingUntil) {
    area.classList.add('shuffling')
    shufflePhase += Math.min(now - previousFrame, 40) * (reducedMotion.matches ? .01 : .046)
    cups.forEach((cup, i) => {
      const angle = shufflePhase + i * Math.PI * 2 / 3
      const x = 512 + Math.sin(angle) * 295 - 487
      cup.style.transform = `translate3d(${x}px, ${Math.cos(angle) * 22}px, 0)`
    })
    whoosh(now)
  }
  previousFrame = now
  shuffleFrame = requestAnimationFrame(animateShuffle)
}
function stir() {
  if (phase === 'choose' || phase === 'failure' || phase === 'success') return
  unlockAudio()
  if (!cameraAttempted) void startCamera()
  if (phase === 'home') {
    endScenario('home', 'shuffle')
    startScenario('shuffle')
    phase = 'shuffling'; viewport.dataset.phase = phase
    shuffleHint.hidden = true; faceHint.hidden = true
    showBread(false)
    get<SVGGElement>('.lid-open').classList.remove('lid-open')
    closingUntil = performance.now() + (reducedMotion.matches ? 0 : 240)
  }
  shuffleEnd = performance.now() + 1850
  if (!shuffleFrame) { previousFrame = performance.now(); shuffleFrame = requestAnimationFrame(animateShuffle) }
  if (audioAvailable && audio.paused) void audio.play().catch(() => { recordedAudioPlaying = false })
}
let readyAt = performance.now() + 3000
let shuffleTimer = 0
let lastX = 0, lastY = 0, previousDX = 0, previousDY = 0
let rubDistance = 0, rubTurns = 0, rubStartedAt = 0, lastMoveAt = 0
function resetRub(event?: PointerEvent) {
  lastX = event?.clientX ?? 0; lastY = event?.clientY ?? 0
  previousDX = previousDY = rubDistance = rubTurns = rubStartedAt = lastMoveAt = 0
}
function queueShuffle() {
  if (phase !== 'home' || performance.now() < readyAt || shuffleTimer) return
  shuffleTimer = window.setTimeout(() => {
    shuffleTimer = 0
    if (phase === 'home') stir()
  }, 350)
}
area.addEventListener('pointerenter', event => resetRub(event))
area.addEventListener('pointerleave', () => resetRub())
area.addEventListener('pointerdown', event => {
  resetRub(event)
  if (event.pointerType !== 'mouse') area.setPointerCapture(event.pointerId)
})
area.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' && !area.hasPointerCapture(event.pointerId)) return
  const now = performance.now()
  if (now < readyAt || now - lastMoveAt > 320) { resetRub(event); lastMoveAt = now; return }
  const dx = event.clientX - lastX, dy = event.clientY - lastY
  const distance = Math.hypot(dx, dy)
  lastX = event.clientX; lastY = event.clientY
  if (distance < 3) return
  if (phase === 'shuffling') { stir(); return }
  if (phase !== 'home') return
  if (!rubStartedAt) rubStartedAt = now
  if (dx * previousDX + dy * previousDY < -distance * Math.hypot(previousDX, previousDY) * .35) rubTurns++
  rubDistance += Math.min(distance, 45)
  previousDX = dx; previousDY = dy; lastMoveAt = now
  if (rubTurns >= 2 && rubDistance >= 75 && now - rubStartedAt >= 220) queueShuffle()
})
area.addEventListener('pointerup', () => resetRub())
area.addEventListener('pointercancel', () => resetRub())
area.addEventListener('keydown', event => { if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); queueShuffle() } })

function pick(cupIndex: number) {
  if (phase !== 'choose') return
  attempts += 1; sessionStorage.setItem('suhsih-attempts', String(attempts))
  cups.forEach(cup => cup.setAttribute('tabindex', '-1'))
  pickPrompt.hidden = true
  const successful = attempts > 1 && crypto.getRandomValues(new Uint8Array(1))[0]! % 2 === 0
  trackEvent('cup_selected', { cup_number: slotOf(cupIndex) + 1, attempt_number: attempts, result: successful ? 'success' : 'failure' })
  endScenario('choose', 'selected')
  endScenario('face_view', 'next_stage')
  phase = successful ? 'success' : 'failure'; viewport.dataset.phase = phase
  startScenario(phase)
  if (successful) {
    successScreen.hidden = false
    updateSuccessFace()
  } else {
    get<HTMLElement>('.result-title').textContent = '실패! 대신 궁시렁은 할 수 있지 ㅋㅋ'
    resultPanel.hidden = false
    cups[cupIndex]!.querySelector('.lid')!.classList.add('lid-open')
    viewport.dataset.failSlot = String(slotOf(cupIndex))
    luckyLetter.style.left = `${centers[slotOf(cupIndex)]! / 1024 * 100}%`
    luckyLetter.hidden = false
    commentPanel.hidden = false
    commentSection.hidden = false
    void refreshComments()
  }
  document.querySelector('.journey')!.classList.add('game-ended')
  window.scrollTo({ top: 0, behavior: 'instant' })
  scheduleLayout()
}
function slotOf(index: number) {
  const x = cups[index]!.style.transform.match(/translate3d\((-?[\d.]+)px/)
  const center = Number(x?.[1] ?? 0) + 487
  return centers.reduce((best, value, i) => Math.abs(value - center) < Math.abs(centers[best]! - center) ? i : best, 0)
}
cups.forEach((cup, i) => {
  cup.addEventListener('click', () => pick(i))
  cup.addEventListener('keydown', event => { if (event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); pick(i) } })
})
let successFrame = 0
let successRenderer: ReturnType<typeof createSuccessFace> | undefined
let successRendererFailed = false
function updateSuccessFace() {
  if (phase !== 'success') return
  try {
    if (!successRendererFailed) {
      successRenderer ??= createSuccessFace(successFace)
      successFigure.classList.toggle('camera-ready', successRenderer.draw(tracker.getFaceFrame()))
    }
  } catch { successRendererFailed = true; successFigure.classList.remove('camera-ready') }
  successFrame = requestAnimationFrame(updateSuccessFace)
}
function restart() {
  if (phase !== 'failure' && phase !== 'success') return
  endScenario(phase === 'failure' ? 'failure' : 'success', 'restart')
  startScenario('home')
  clearTimeout(shuffleTimer); shuffleTimer = 0
  readyAt = performance.now() + 3000; resetRub()
  shuffleHint.hidden = true; faceHint.hidden = true
  phase = 'home'; viewport.dataset.phase = phase
  cancelAnimationFrame(successFrame)
  resultPanel.hidden = true; successScreen.hidden = true; commentPanel.hidden = true; commentSection.hidden = true
  luckyLetter.hidden = true; delete viewport.dataset.failSlot
  document.querySelector('.journey')!.classList.remove('game-ended')
  cups.forEach((cup, i) => {
    cup.style.transform = `translate3d(${centers[i]! - 487}px, 0, 0)`
    cup.querySelector('.lid')!.classList.toggle('lid-open', i === 1)
  })
  const centerLid = cups[1]!.querySelector('.lid')!
  cups[1]!.insertBefore(breadShadow, centerLid); cups[1]!.insertBefore(bread, centerLid)
  showBread(true)
  window.scrollTo({ top: 0, behavior: 'instant' })
  scheduleLayout()
}
get<HTMLButtonElement>('.restart').addEventListener('click', restart)
luckyLetter.addEventListener('click', () => {
  if (phase !== 'failure') return
  trackEvent('lucky_letter_opened')
  const message = get<HTMLTextAreaElement>('.comment-form textarea')
  message.focus({ preventScroll: true })
  message.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' })
})
get<HTMLButtonElement>('.play-again').addEventListener('click', restart)
get<HTMLButtonElement>('.eat-bread').addEventListener('click', () => {
  endScenario('success', 'eat_page')
  window.location.href = `${base}eat.html`
})

let comments: Comment[] = []
const list = get<HTMLDivElement>('.comments-list')
function renderComments() {
  list.replaceChildren()
  for (const comment of comments) {
    const item = document.createElement('article')
    item.className = 'comment-bubble'
    const message = document.createElement('p'), name = document.createElement('span')
    message.textContent = comment.message; name.textContent = `From. ${comment.name}`
    item.append(message, name); list.append(item)
  }
}
async function refreshComments() {
  const status = get<HTMLParagraphElement>('.comments-status')
  if (!commentsReady()) { status.textContent = '코멘트 저장 연결을 확인해주세요.'; return }
  try { comments = await listComments(); renderComments(); status.textContent = comments.length ? '' : '아직 코멘트가 없어요.' }
  catch (error) { status.textContent = error instanceof Error ? error.message : '코멘트를 불러오지 못했어요.' }
}
get<HTMLFormElement>('.comment-form').addEventListener('submit', async event => {
  event.preventDefault()
  const form = event.currentTarget as HTMLFormElement
  const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
  const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value.trim()
  const status = get<HTMLParagraphElement>('.form-status')
  if (!name || !message) { status.textContent = '이름과 코멘트를 모두 입력해주세요.'; return }
  const send = get<HTMLButtonElement>('.send'); send.disabled = true; status.textContent = '전송 중…'
  try {
    const saved = await addComment(name, message)
    trackEvent('comment_submitted')
    comments.unshift(saved); renderComments(); form.reset(); status.textContent = '전송했어요.'
    get<HTMLParagraphElement>('.comments-status').textContent = ''
  } catch (error) { trackEvent('comment_submit_failed'); status.textContent = error instanceof Error ? error.message : '전송에 실패했어요.' }
  finally { send.disabled = false }
})
document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause() })
window.addEventListener('pagehide', () => { endAllScenarios('page_exit'); clearTimeout(shuffleTimer); tracker.stop(); audio.pause(); cancelAnimationFrame(shuffleFrame); cancelAnimationFrame(successFrame); cancelAnimationFrame(layoutFrame); void audioContext?.close() })
