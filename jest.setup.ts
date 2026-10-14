import { setDemoTodayForTests } from '@/domain/demoClock';

// Seed data is authored for the week of 2026-09-14; pin the clock so date assertions are stable.
setDemoTodayForTests('2026-09-14');
