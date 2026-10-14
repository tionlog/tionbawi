type Scenario = 'home' | 'face_view' | 'shuffle' | 'choose' | 'failure' | 'success' | 'eat'
type EventValue = string | number | boolean
type EventParams = Record<string, EventValue>

declare global {
  interface Window {
    gtag?: (command: 'event', name: string, params?: EventParams) => void
  }
}

const activeScenarios = new Map<Scenario, number>()

export function trackEvent(name: string, params: EventParams = {}) {
  window.gtag?.('event', name, params)
}

export function startScenario(scenario: Scenario) {
  if (activeScenarios.has(scenario)) return
  activeScenarios.set(scenario, performance.now())
  trackEvent(`${scenario}_start`)
}

export function endScenario(scenario: Scenario, reason: string) {
  const startedAt = activeScenarios.get(scenario)
  if (startedAt === undefined) return
  activeScenarios.delete(scenario)
  trackEvent(`${scenario}_end`, {
    reason,
    duration_ms: Math.round(performance.now() - startedAt),
  })
}

export function endAllScenarios(reason: string) {
  for (const scenario of activeScenarios.keys()) endScenario(scenario, reason)
}
