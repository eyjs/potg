/**
 * 경매 사운드 SSOT — 모듈 싱글턴 Web Audio 엔진.
 *
 * 단일 공유 `AudioContext`를 lazy 생성해 훅(`use-auction-sound.ts`)과
 * 리프 컴포넌트(카드/타이머)가 동일 컨텍스트로 사운드를 재생한다.
 * 신규 npm 패키지/mp3 에셋 없이 오실레이터/노이즈/컨볼버 레이어링으로
 * 게임급 타격감·공간감을 합성한다 (feedback-001).
 *
 * export 함수 (task-003/004가 import 하여 직접 호출):
 * - `unlockAudio(): void`
 * - `playBidSound(comboLevel: number): void`
 * - `playSoldSound(): void`
 * - `playPassSound(): void`
 * - `playRevealLegendary(): void`
 * - `startFuseCrackle(): void`
 * - `stopFuseCrackle(): void`
 * - `bidComboLevel(count: number): 0 | 1 | 2 | 3`
 * - `COMBO_WINDOW_MS = 3000`
 */

/** 콤보 판정 윈도우(ms) — task-003 카드 로컬 계산과 동일 값 공유 (motion-spec §2.1). */
export const COMBO_WINDOW_MS = 3000

/**
 * 콤보 카운트 → 단계(0~3) 순수 함수.
 * 임계값: L0=1, L1=2~3, L2=4~5, L3=6+ (motion-spec §2.2와 완전 동일).
 */
export function bidComboLevel(count: number): 0 | 1 | 2 | 3 {
  if (count >= 6) return 3
  if (count >= 4) return 2
  if (count >= 2) return 1
  return 0
}

/** Safari 등 구형 webkit 브라우저 대응 — window.AudioContext 부재 시 폴백. */
interface WebkitWindow {
  webkitAudioContext?: typeof AudioContext
}

function resolveAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  return window.AudioContext ?? (window as unknown as WebkitWindow).webkitAudioContext
}

let sharedAudioContext: AudioContext | null = null
let masterGainNode: GainNode | null = null
let reverbImpulseBuffer: AudioBuffer | null = null

/** 단일 공유 AudioContext + 마스터 게인(클리핑 방지)을 lazy 생성한다. */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedAudioContext) return sharedAudioContext

  const Ctor = resolveAudioContextCtor()
  if (!Ctor) return null

  try {
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(ctx.destination)

    sharedAudioContext = ctx
    masterGainNode = master
    return ctx
  } catch (error) {
    console.warn('[auction-audio-engine] AudioContext 생성 실패', error)
    return null
  }
}

function getMasterGain(ctx: AudioContext): GainNode {
  if (masterGainNode) return masterGainNode
  const master = ctx.createGain()
  master.gain.value = 0.7
  master.connect(ctx.destination)
  masterGainNode = master
  return master
}

/**
 * 짧은 리버브 테일용 임펄스 응답을 프로그램적으로 생성한다 (신규 에셋 없이 합성).
 * 지수 감쇠하는 화이트노이즈 스테레오 버퍼 — ConvolverNode에 1회만 주입 후 캐시한다.
 */
function getReverbImpulse(ctx: AudioContext): AudioBuffer {
  if (reverbImpulseBuffer) return reverbImpulseBuffer

  const durationSec = 1.4
  const sampleRate = ctx.sampleRate
  const length = Math.floor(sampleRate * durationSec)
  const impulse = ctx.createBuffer(2, length, sampleRate)

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      const decay = Math.pow(1 - i / length, 2.6)
      data[i] = (Math.random() * 2 - 1) * decay
    }
  }

  reverbImpulseBuffer = impulse
  return impulse
}

/** ConvolverNode 기반 리버브 센드를 생성해 반환한다 (dry 신호는 별도 경로로 마스터에 직결). */
function createReverbSend(ctx: AudioContext, wetGain: number): { input: GainNode; output: AudioNode } {
  const convolver = ctx.createConvolver()
  convolver.buffer = getReverbImpulse(ctx)
  const input = ctx.createGain()
  const wet = ctx.createGain()
  wet.gain.value = wetGain
  input.connect(convolver)
  convolver.connect(wet)
  wet.connect(getMasterGain(ctx))
  return { input, output: wet }
}

/** 짧은 화이트노이즈 버퍼(타격 트랜지언트/크래클 공용 소스)를 생성한다. */
function createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

/** ADSR 게인 엔벨로프를 gainNode.gain 파라미터에 스케줄링한다. */
function applyAdsrEnvelope(
  gainParam: AudioParam,
  now: number,
  peak: number,
  sustainLevel: number,
  attackSec: number,
  decaySec: number,
  sustainSec: number,
  releaseSec: number,
): void {
  const attackEnd = now + attackSec
  const decayEnd = attackEnd + decaySec
  const sustainEnd = decayEnd + sustainSec
  const releaseEnd = sustainEnd + releaseSec

  gainParam.cancelScheduledValues(now)
  gainParam.setValueAtTime(0, now)
  gainParam.linearRampToValueAtTime(peak, attackEnd)
  gainParam.linearRampToValueAtTime(sustainLevel, decayEnd)
  gainParam.setValueAtTime(sustainLevel, sustainEnd)
  gainParam.linearRampToValueAtTime(0, releaseEnd)
}

/** 미세 랜덤 피치 변주(±센트) — 반복 재생 피로 방지. */
function randomDetuneCents(range = 6): number {
  return (Math.random() * 2 - 1) * range
}

interface OscillatorLayer {
  type: OscillatorType
  frequency: number
  detuneCents: number
  gain: number
}

/**
 * 오실레이터 2~3개 디튠 레이어링 + BiquadFilter를 마스터(또는 리버브 센드)에 연결한다.
 * 각 레이어는 독립 게인으로 합쳐져 두께감 있는 톤을 만든다.
 */
function playOscillatorLayers(
  ctx: AudioContext,
  destination: AudioNode,
  layers: OscillatorLayer[],
  now: number,
  durationSec: number,
  filterType: BiquadFilterType,
  filterStart: number,
  filterEnd: number,
  envelope: { peak: number; sustain: number; attack: number; decay: number; sustainSec: number; release: number },
  pitchDrop?: { from: number; to: number },
): void {
  const filter = ctx.createBiquadFilter()
  filter.type = filterType
  filter.frequency.setValueAtTime(filterStart, now)
  filter.frequency.linearRampToValueAtTime(filterEnd, now + durationSec)
  filter.connect(destination)

  layers.forEach((layer) => {
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.type = layer.type
    osc.detune.value = layer.detuneCents + randomDetuneCents()

    if (pitchDrop) {
      osc.frequency.setValueAtTime(pitchDrop.from, now)
      osc.frequency.exponentialRampToValueAtTime(Math.max(pitchDrop.to, 1), now + durationSec)
    } else {
      osc.frequency.setValueAtTime(layer.frequency, now)
    }

    applyAdsrEnvelope(
      gainNode.gain,
      now,
      envelope.peak * layer.gain,
      envelope.sustain * layer.gain,
      envelope.attack,
      envelope.decay,
      envelope.sustainSec,
      envelope.release,
    )

    osc.connect(gainNode)
    gainNode.connect(filter)
    osc.start(now)
    osc.stop(now + durationSec + envelope.release + 0.05)
  })
}

/** 필터드 노이즈 트랜지언트(타격감) 재생 — 짧고 굵은 "탁" 어택. */
function playNoiseTransient(
  ctx: AudioContext,
  destination: AudioNode,
  now: number,
  durationSec: number,
  peakGain: number,
  filterFreq: number,
  filterType: BiquadFilterType = 'bandpass',
): void {
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = createNoiseBuffer(ctx, durationSec)

  const filter = ctx.createBiquadFilter()
  filter.type = filterType
  filter.frequency.value = filterFreq
  filter.Q.value = filterType === 'bandpass' ? 0.9 : 1

  const gainNode = ctx.createGain()
  applyAdsrEnvelope(gainNode.gain, now, peakGain, peakGain * 0.15, 0.003, 0.03, 0.01, durationSec)

  noiseSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(destination)
  noiseSource.start(now)
  noiseSource.stop(now + durationSec + 0.05)
}

/**
 * 입찰 사운드 — 묵직한 "탁/척" 타격음.
 * 필터드 노이즈 트랜지언트 + 사인 피치 드롭(200→80Hz) + 콤보 단계별 피치/밝기 상승.
 * 총 길이 약 140ms.
 */
export function playBidSound(comboLevel: number): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const master = getMasterGain(ctx)
    const now = ctx.currentTime
    const level = Math.min(Math.max(comboLevel, 0), 3)

    // 콤보 단계에 따라 피치/밝기 상승 (L0 기본 → L3 최대)
    const pitchBoost = 1 + level * 0.18
    const brightnessBoost = 1200 + level * 900
    const gainBoost = 0.9 + level * 0.12

    playNoiseTransient(ctx, master, now, 0.05, 0.5 * gainBoost, brightnessBoost, 'bandpass')

    playOscillatorLayers(
      ctx,
      master,
      [
        { type: 'sine', frequency: 200 * pitchBoost, detuneCents: 0, gain: 1 },
        { type: 'triangle', frequency: 200 * pitchBoost, detuneCents: 12, gain: 0.5 },
      ],
      now,
      0.11,
      'lowpass',
      brightnessBoost,
      brightnessBoost * 0.4,
      { peak: 0.55 * gainBoost, sustain: 0.05, attack: 0.004, decay: 0.03, sustainSec: 0.01, release: 0.06 },
      { from: 200 * pitchBoost, to: 80 * pitchBoost },
    )
  } catch (error) {
    console.warn('[auction-audio-engine] playBidSound 실패', error)
  }
}

/**
 * 낙찰 사운드 — 승리 팡파레.
 * 메이저 3음(도-미-솔) 순차 아르페지오 + 상단 shimmer 레이어 + 긴 리버브 테일.
 * 총 길이 약 900ms(카드 골든 변신 450~500ms + 여운과 대략 동조, motion-spec §4.2 참조).
 */
export function playSoldSound(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const master = getMasterGain(ctx)
    const reverb = createReverbSend(ctx, 0.45)
    const now = ctx.currentTime

    const arpeggioFreqs = [523.25, 659.25, 783.99] // C5-E5-G5 메이저 아르페지오
    const noteGapSec = 0.09

    arpeggioFreqs.forEach((freq, index) => {
      const noteStart = now + index * noteGapSec
      const dest = reverb.input
      playOscillatorLayers(
        ctx,
        dest,
        [
          { type: 'triangle', frequency: freq, detuneCents: 0, gain: 1 },
          { type: 'sine', frequency: freq * 2, detuneCents: 5, gain: 0.35 }, // shimmer 옥타브 위
        ],
        noteStart,
        0.32,
        'lowpass',
        6000,
        3200,
        { peak: 0.32, sustain: 0.1, attack: 0.01, decay: 0.08, sustainSec: 0.1, release: 0.22 },
      )
      // dry 신호도 마스터로 소량 직결(리버브만이면 먹먹해지므로 밸런스 확보)
      const dryOsc = ctx.createOscillator()
      const dryGain = ctx.createGain()
      dryOsc.type = 'triangle'
      dryOsc.frequency.setValueAtTime(freq, noteStart)
      applyAdsrEnvelope(dryGain.gain, noteStart, 0.22, 0.06, 0.01, 0.08, 0.1, 0.22)
      dryOsc.connect(dryGain)
      dryGain.connect(master)
      dryOsc.start(noteStart)
      dryOsc.stop(noteStart + 0.42)
    })
  } catch (error) {
    console.warn('[auction-audio-engine] playSoldSound 실패', error)
  }
}

/**
 * 유찰 사운드 — 낙담 톤.
 * 마이너 하강 2음 + lowpass 닫힘 + 짧은 리버브. 불쾌하지 않게 음량 절제.
 */
export function playPassSound(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const reverb = createReverbSend(ctx, 0.2)
    const now = ctx.currentTime

    const descendingFreqs = [349.23, 293.66] // F4 -> D4 (마이너 하강)
    const noteGapSec = 0.14

    descendingFreqs.forEach((freq, index) => {
      const noteStart = now + index * noteGapSec
      playOscillatorLayers(
        ctx,
        reverb.input,
        [
          { type: 'sine', frequency: freq, detuneCents: 0, gain: 1 },
          { type: 'triangle', frequency: freq, detuneCents: -8, gain: 0.4 },
        ],
        noteStart,
        0.3,
        'lowpass',
        1800,
        420,
        { peak: 0.16, sustain: 0.04, attack: 0.015, decay: 0.09, sustainSec: 0.06, release: 0.18 },
      )
    })
  } catch (error) {
    console.warn('[auction-audio-engine] playPassSound 실패', error)
  }
}

/**
 * 전설 공개 사운드 — 상승 shimmer + 임팩트 + 리버브.
 * 카드가 매물 전환 시 1회 직접 호출한다(motion-spec §1.4, t=560ms).
 */
export function playRevealLegendary(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const master = getMasterGain(ctx)
    const reverb = createReverbSend(ctx, 0.55)
    const now = ctx.currentTime

    // 상승 shimmer — 저음에서 고음으로 스윕하는 레이어
    const shimmerOsc = ctx.createOscillator()
    const shimmerGain = ctx.createGain()
    shimmerOsc.type = 'sawtooth'
    shimmerOsc.frequency.setValueAtTime(220, now)
    shimmerOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.5)
    const shimmerFilter = ctx.createBiquadFilter()
    shimmerFilter.type = 'highpass'
    shimmerFilter.frequency.setValueAtTime(300, now)
    shimmerFilter.frequency.linearRampToValueAtTime(1200, now + 0.5)
    applyAdsrEnvelope(shimmerGain.gain, now, 0.22, 0.08, 0.05, 0.2, 0.15, 0.3)
    shimmerOsc.connect(shimmerFilter)
    shimmerFilter.connect(shimmerGain)
    shimmerGain.connect(reverb.input)
    shimmerOsc.start(now)
    shimmerOsc.stop(now + 0.85)

    // 임팩트 — 노이즈 트랜지언트 + 저음 펀치
    const impactStart = now + 0.45
    playNoiseTransient(ctx, master, impactStart, 0.08, 0.6, 2000, 'bandpass')
    playOscillatorLayers(
      ctx,
      reverb.input,
      [
        { type: 'sine', frequency: 130, detuneCents: 0, gain: 1 },
        { type: 'triangle', frequency: 130, detuneCents: 6, gain: 0.5 },
        { type: 'sine', frequency: 260, detuneCents: -4, gain: 0.3 },
      ],
      impactStart,
      0.4,
      'lowpass',
      2400,
      600,
      { peak: 0.5, sustain: 0.1, attack: 0.006, decay: 0.1, sustainSec: 0.1, release: 0.35 },
    )
  } catch (error) {
    console.warn('[auction-audio-engine] playRevealLegendary 실패', error)
  }
}

// ── 도화선 크래클 (루프) ────────────────────────────────────────────
let fuseCrackleRunning = false
let fuseCrackleSource: AudioBufferSourceNode | null = null
let fuseCrackleGain: GainNode | null = null
let fuseCrackleModulationId: ReturnType<typeof setInterval> | null = null

/**
 * 도화선 지지직 크래클 시작 — 노이즈 + highpass + 랜덤 게인 모듈레이션 루프.
 * 마감 임박(`isUrgent`) 진입 시 타이머가 직접 호출. 중복 시작 방지(내부 running 플래그).
 */
export function startFuseCrackle(): void {
  if (fuseCrackleRunning) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const master = getMasterGain(ctx)

    const loopBuffer = createNoiseBuffer(ctx, 2)
    const source = ctx.createBufferSource()
    source.buffer = loopBuffer
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2200
    filter.Q.value = 0.7

    const gainNode = ctx.createGain()
    gainNode.gain.value = 0.03

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(master)
    source.start()

    fuseCrackleSource = source
    fuseCrackleGain = gainNode
    fuseCrackleRunning = true

    // 랜덤 게인 모듈레이션 — 100ms 간격으로 지지직대는 불규칙 강도 변화
    fuseCrackleModulationId = setInterval(() => {
      if (!fuseCrackleGain || !sharedAudioContext) return
      const target = 0.015 + Math.random() * 0.05
      fuseCrackleGain.gain.linearRampToValueAtTime(target, sharedAudioContext.currentTime + 0.08)
    }, 100)
  } catch (error) {
    console.warn('[auction-audio-engine] startFuseCrackle 실패', error)
    fuseCrackleRunning = false
  }
}

/** 도화선 크래클 완전 정지 — 마감 임박 이탈/타이머 언마운트 시 호출. */
export function stopFuseCrackle(): void {
  if (!fuseCrackleRunning) return
  try {
    if (fuseCrackleModulationId !== null) {
      clearInterval(fuseCrackleModulationId)
      fuseCrackleModulationId = null
    }
    if (fuseCrackleSource) {
      fuseCrackleSource.stop()
      fuseCrackleSource.disconnect()
      fuseCrackleSource = null
    }
    if (fuseCrackleGain) {
      fuseCrackleGain.disconnect()
      fuseCrackleGain = null
    }
  } catch (error) {
    console.warn('[auction-audio-engine] stopFuseCrackle 실패', error)
  } finally {
    fuseCrackleRunning = false
  }
}

/**
 * suspended AudioContext resume — 모바일 autoplay 정책 대응.
 * 최초 사용자 제스처(pointerdown/touchstart)에서 훅이 호출한다.
 */
export function unlockAudio(): void {
  try {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // resume 실패는 조용히 무시 — 다음 재생 시도 시 재시도됨
      })
    }
  } catch (error) {
    console.warn('[auction-audio-engine] unlockAudio 실패', error)
  }
}
