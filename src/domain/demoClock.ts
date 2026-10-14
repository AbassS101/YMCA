export const DEMO_TODAY = '2026-09-14';

export function getDemoToday(): string {
  return DEMO_TODAY;
}

/** ISO timestamp on the demo calendar day with the real wall-clock time. */
export function demoNowIso(): string {
  return `${getDemoToday()}T${new Date().toISOString().slice(11)}`;
}
