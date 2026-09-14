# YMCA Silver Spring App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a pitch-ready Expo (iOS/Android) prototype for YMCA Silver Spring with member wallet Home, schedules, cancel/payment flows, trainer messaging, thin staff mode, and a mock Protivity adapter.

**Architecture:** Expo Router screens call repositories; repositories call a typed `ProtivityPort`. V1 injects `MockProtivityAdapter` (AsyncStorage + seed). `LiveProtivityAdapter` stubs until credentials exist. UI never imports mock vs live. Demo clock frozen at 2026-09-14.

**Tech Stack:** Expo (SDK 52+), React Native, TypeScript, Expo Router, AsyncStorage, Jest + React Native Testing Library, Node 20+.

**Spec:** `docs/superpowers/specs/2026-09-14-ymca-silver-spring-app-design.md`

## Global Constraints

- Branding: scarlet `#C8102E`, near-black `#1D1D1F`, off-white `#F4F1EE`, wordmark **YMCA SILVER SPRING**, triangle mark in header
- Branch: 9800 Hastings Drive, Silver Spring, MD 20901; (301) 585-2120; silverspring@ymcadc.org
- Hours: Mon–Fri 5:30am–10pm; Sat 7am–8pm; Sun 8am–8pm
- Demo accounts: `jordan@silverspring.ymca` / `alex@silverspring.ymca`, shared password `ymca-demo`
- Jordan membership ID `448291`, Adult `$80.00`, next bill `2026-10-12`, Visa `4242`
- Demo clock frozen at `2026-09-14` until Reset demo data
- `EXPO_PUBLIC_PROTIVITY_MODE=mock|live` selects adapter; live without credentials throws `ProtivityNotConnected`
- Never persist PAN or CVC to AsyncStorage, logs, or seed
- Cancel is one-month written notice, never instant
- About copy: “Prototype — not an official published YMCA app.”
- Do not publish to App Store / Play Store as official YMCA product without association authorization

---

## File structure

```
app/
  _layout.tsx                 # providers + root stack
  index.tsx                   # auth redirect
  login.tsx
  (member)/
    _layout.tsx               # Home | Schedules | Trainers | Account tabs
    home.tsx
    schedules.tsx
    trainers.tsx
    account.tsx
    update-payment.tsx
    cancel.tsx
    about.tsx
  (staff)/
    _layout.tsx               # Today | Members | Messages | Me tabs
    today.tsx
    members.tsx
    members/[id].tsx
    messages/index.tsx
    messages/[threadId].tsx
    me.tsx
src/
  theme/colors.ts
  theme/typography.ts
  domain/types.ts
  domain/demoClock.ts
  domain/cancelDates.ts
  domain/paymentTokenizer.ts
  storage/demoStore.ts
  protivity/ProtivityPort.ts
  protivity/ProtivityNotConnected.ts
  protivity/seed.ts
  protivity/MockProtivityAdapter.ts
  protivity/LiveProtivityAdapter.ts
  protivity/createProtivityClient.ts
  repositories/authRepo.ts
  repositories/membershipRepo.ts
  repositories/scheduleRepo.ts
  repositories/messageRepo.ts
  repositories/savedClassesRepo.ts
  context/SessionContext.tsx
  context/AppProviders.tsx
  components/YHeader.tsx
  components/BillingHero.tsx
  components/ErrorBanner.tsx
  components/ScheduleRow.tsx
  components/MessageThread.tsx
  components/PrimaryButton.tsx
  components/TextField.tsx
__tests__/
  cancelDates.test.ts
  paymentTokenizer.test.ts
  MockProtivityAdapter.test.ts
  demoStore.payment.test.ts
assets/                     # Expo default icons (scaffold)
README.md
package.json
app.json
tsconfig.json
jest.config.js
.env.example
```

---

### Task 1: Scaffold Expo app and project basics

**Files:**
- Create: entire Expo project at repo root (overwrite empty workspace carefully; keep `docs/` and `.gitignore`)
- Create: `README.md`, `.env.example`, `jest.config.js`
- Modify: `.gitignore` if Expo scaffold adds entries already covered

**Interfaces:**
- Consumes: none
- Produces: runnable Expo app with TypeScript + Expo Router; Jest configured for `*.test.ts`

- [ ] **Step 1: Create Expo app in a temp folder, then merge into repo root**

Run from repo root (PowerShell):

```powershell
npx create-expo-app@latest _scaffold --template tabs
# Move app files up; keep docs/ and existing .gitignore
Copy-Item -Recurse -Force _scaffold\* .
Remove-Item -Recurse -Force _scaffold
```

If the tabs template conflicts with planned route names, convert to Expo Router blank and add routes in later tasks. Prefer:

```powershell
npx create-expo-app@latest _scaffold --template blank-typescript
```

Then install:

```powershell
npx expo install expo-router react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage react-native-gesture-handler react-native-reanimated
npm install --save-dev jest @types/jest ts-jest @testing-library/react-native @testing-library/jest-native
```

Ensure `package.json` has `"main": "expo-router/entry"` and scripts:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest",
    "lint": "expo lint"
  }
}
```

- [ ] **Step 2: Add Jest config**

Create `jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: [],
};
```

Install preset if needed: `npm install --save-dev jest-expo`

Add to `tsconfig.json` paths:

```json
{
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- [ ] **Step 3: Write README and env example**

`.env.example`:

```
EXPO_PUBLIC_PROTIVITY_MODE=mock
```

`README.md` must include:

```markdown
# YMCA Silver Spring App (prototype)

Demo logins (password for both: `ymca-demo`):
- Member: jordan@silverspring.ymca
- Staff: alex@silverspring.ymca

Prototype — not an official published YMCA app.

## Run
npm install
npm start

## Tests
npm test
```

- [ ] **Step 4: Create theme files**

`src/theme/colors.ts`:

```ts
export const colors = {
  scarlet: '#C8102E',
  nearBlack: '#1D1D1F',
  offWhite: '#F4F1EE',
  white: '#FFFFFF',
  muted: '#6B6560',
  border: '#E5E0DC',
} as const;
```

`src/theme/typography.ts`:

```ts
export const typography = {
  wordmark: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.3 },
  heroDate: { fontSize: 28, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  label: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.8, textTransform: 'uppercase' as const },
};
```

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "chore: scaffold Expo app for YMCA Silver Spring prototype"
```

---

### Task 2: Domain types and demo clock

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/demoClock.ts`
- Test: `__tests__/demoClock.test.ts`

**Interfaces:**
- Consumes: none
- Produces: all domain types below; `getDemoToday(): string` (`YYYY-MM-DD`); `DEMO_TODAY = '2026-09-14'`

- [ ] **Step 1: Write failing demo clock test**

`__tests__/demoClock.test.ts`:

```ts
import { DEMO_TODAY, getDemoToday } from '@/domain/demoClock';

test('demo clock is frozen at 2026-09-14', () => {
  expect(DEMO_TODAY).toBe('2026-09-14');
  expect(getDemoToday()).toBe('2026-09-14');
});
```

- [ ] **Step 2: Run test — expect FAIL**

```powershell
npm test -- __tests__/demoClock.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement types and clock**

`src/domain/types.ts`:

```ts
export type UserRole = 'member' | 'staff';
export type MemberStatus = 'active' | 'cancel_pending';
export type ScheduleCategory = 'groupEx' | 'swim' | 'childWatch' | 'event';

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  membershipId: string;
  homeBranchId: string;
  type: string;
  status: MemberStatus;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  roleLabel: string;
  homeBranchId: string;
};

export type Membership = {
  memberId: string;
  rateName: string;
  monthlyAmountCents: number;
  nextBillingDate: string;
  paymentBrand: string;
  paymentLast4: string;
  cancelEffectiveDate?: string;
  lastBillDate?: string;
};

export type ScheduleItem = {
  id: string;
  branchId: string;
  category: ScheduleCategory;
  title: string;
  start: string; // ISO
  end: string;
  location: string;
  instructorName: string;
  staffId?: string;
};

export type SavedClass = { memberId: string; scheduleItemId: string };

export type TrainerAssignment = { memberId: string; staffId: string };

export type Thread = { id: string; memberId: string; staffId: string };

export type Message = {
  id: string;
  threadId: string;
  fromId: string;
  body: string;
  createdAt: string;
};

export type CancelRequest = {
  id: string;
  memberId: string;
  reason: string;
  requestedAt: string;
  lastBillDate: string;
  accessThrough: string;
  status: 'submitted';
};

export type AuthSession = { userId: string; role: UserRole };
```

`src/domain/demoClock.ts`:

```ts
export const DEMO_TODAY = '2026-09-14';

export function getDemoToday(): string {
  return DEMO_TODAY;
}
```

- [ ] **Step 4: Run test — expect PASS**

```powershell
npm test -- __tests__/demoClock.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add src/domain __tests__/demoClock.test.ts
git commit -m "feat: add domain types and frozen demo clock"
```

---

### Task 3: Cancel date math (TDD)

**Files:**
- Create: `src/domain/cancelDates.ts`
- Test: `__tests__/cancelDates.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `computeCancelDates({ nextBillingDate, requestedAt, previousBillingDate? }) → { lastBillDate, accessThrough, noticeDeadline }`

Rules from spec:

- `noticeDeadline` = `nextBillingDate` minus one calendar month
- If `requestedAt` ≤ `noticeDeadline`: last bill = previous (or empty string if none); accessThrough = day before nextBillingDate
- If `requestedAt` > `noticeDeadline`: lastBillDate = nextBillingDate; accessThrough = nextBillingDate + 1 month − 1 day

- [ ] **Step 1: Write failing tests**

```ts
import { computeCancelDates } from '@/domain/cancelDates';

test('after deadline: Sep 14 with next bill Oct 12 → last bill Oct 12, access through Nov 11', () => {
  const result = computeCancelDates({
    nextBillingDate: '2026-10-12',
    requestedAt: '2026-09-14',
  });
  expect(result.noticeDeadline).toBe('2026-09-12');
  expect(result.lastBillDate).toBe('2026-10-12');
  expect(result.accessThrough).toBe('2026-11-11');
});

test('on or before deadline: skips upcoming draft', () => {
  const result = computeCancelDates({
    nextBillingDate: '2026-10-12',
    requestedAt: '2026-09-12',
    previousBillingDate: '2026-09-12',
  });
  expect(result.lastBillDate).toBe('2026-09-12');
  expect(result.accessThrough).toBe('2026-10-11');
});

test('before deadline with no previous bill', () => {
  const result = computeCancelDates({
    nextBillingDate: '2026-10-12',
    requestedAt: '2026-09-01',
  });
  expect(result.lastBillDate).toBe('');
  expect(result.accessThrough).toBe('2026-10-11');
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```powershell
npm test -- __tests__/cancelDates.test.ts
```

- [ ] **Step 3: Implement**

`src/domain/cancelDates.ts`:

```ts
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addCalendarMonths(ymd: string, months: number): string {
  const dt = parseYmd(ymd);
  const day = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(day, lastDay));
  return formatYmd(dt);
}

function addDays(ymd: string, days: number): string {
  const dt = parseYmd(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatYmd(dt);
}

export function computeCancelDates(input: {
  nextBillingDate: string;
  requestedAt: string;
  previousBillingDate?: string;
}): { noticeDeadline: string; lastBillDate: string; accessThrough: string } {
  const noticeDeadline = addCalendarMonths(input.nextBillingDate, -1);
  if (input.requestedAt <= noticeDeadline) {
    return {
      noticeDeadline,
      lastBillDate: input.previousBillingDate ?? '',
      accessThrough: addDays(input.nextBillingDate, -1),
    };
  }
  return {
    noticeDeadline,
    lastBillDate: input.nextBillingDate,
    accessThrough: addDays(addCalendarMonths(input.nextBillingDate, 1), -1),
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

```powershell
npm test -- __tests__/cancelDates.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add src/domain/cancelDates.ts __tests__/cancelDates.test.ts
git commit -m "feat: add YMCA DC cancel notice date math"
```

---

### Task 4: Payment tokenizer (TDD)

**Files:**
- Create: `src/domain/paymentTokenizer.ts`
- Test: `__tests__/paymentTokenizer.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `tokenizePayment({ number, brandHint? }) → { brand, last4 }`; `luhnOk(number: string): boolean`; throws on invalid

- [ ] **Step 1: Write failing tests**

```ts
import { luhnOk, tokenizePayment } from '@/domain/paymentTokenizer';

test('tokenizes Visa test number to brand + last4', () => {
  expect(tokenizePayment({ number: '4242424242424242' })).toEqual({
    brand: 'Visa',
    last4: '4242',
  });
});

test('rejects invalid luhn', () => {
  expect(luhnOk('4242424242424241')).toBe(false);
  expect(() => tokenizePayment({ number: '1234' })).toThrow();
});

test('never returns full PAN', () => {
  const result = tokenizePayment({ number: '4111111111111111' });
  expect(JSON.stringify(result)).not.toMatch(/\d{13,19}/);
});
```

- [ ] **Step 2: Run — expect FAIL**

```powershell
npm test -- __tests__/paymentTokenizer.test.ts
```

- [ ] **Step 3: Implement**

```ts
export function luhnOk(raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function detectBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
}

export function tokenizePayment(input: { number: string }): { brand: string; last4: string } {
  const digits = input.number.replace(/\D/g, '');
  if (!luhnOk(digits)) throw new Error('Invalid card number');
  return { brand: detectBrand(digits), last4: digits.slice(-4) };
}
```

- [ ] **Step 4: Run — expect PASS**

```powershell
npm test -- __tests__/paymentTokenizer.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add src/domain/paymentTokenizer.ts __tests__/paymentTokenizer.test.ts
git commit -m "feat: add payment tokenizer (brand + last4 only)"
```

---

### Task 5: Seed data and demo store

**Files:**
- Create: `src/protivity/seed.ts`
- Create: `src/storage/demoStore.ts`
- Test: `__tests__/demoStore.payment.test.ts`

**Interfaces:**
- Consumes: domain types
- Produces: `SEED` constant; `loadStore()`, `saveStore(state)`, `resetStore()`, `DemoState` type; credentials in seed: password hash plain `ymca-demo` for mock only

`DemoState` shape:

```ts
export type DemoState = {
  members: Member[];
  staff: Staff[];
  memberships: Membership[];
  schedules: ScheduleItem[];
  savedClasses: SavedClass[];
  assignments: TrainerAssignment[];
  threads: Thread[];
  messages: Message[];
  cancelRequests: CancelRequest[];
  credentials: { email: string; password: string; userId: string; role: UserRole }[];
};
```

Seed must include:

- Branch id `silver-spring`
- Jordan: id `member-jordan`, membershipId `448291`, address in Silver Spring, phone, email `jordan@silverspring.ymca`
- Alex: id `staff-alex`, roleLabel `Personal Wellness`, email `alex@silverspring.ymca`
- Membership: monthlyAmountCents `8000`, nextBillingDate `2026-10-12`, Visa `4242`
- Thread `thread-jordan-alex` linking them
- ≥1 week of schedules including BodyPump, Yoga Flow, Aqua Fit, Cycle across categories; at least one class with `staffId: 'staff-alex'`
- Assignment Jordan → Alex

- [ ] **Step 1: Write failing persistence test**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadStore, resetStore, saveStore } from '@/storage/demoStore';
import { SEED } from '@/protivity/seed';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('reset loads seed and payment update never stores PAN', async () => {
  await resetStore();
  const state = await loadStore();
  expect(state.memberships[0].paymentLast4).toBe('4242');
  expect(JSON.stringify(state)).not.toMatch(/4242424242424242/);

  const next = {
    ...state,
    memberships: state.memberships.map((m) =>
      m.memberId === 'member-jordan'
        ? { ...m, paymentBrand: 'Visa', paymentLast4: '1111' }
        : m
    ),
  };
  await saveStore(next);
  const reloaded = await loadStore();
  expect(reloaded.memberships[0].paymentLast4).toBe('1111');
  expect(JSON.stringify(reloaded)).not.toMatch(/\d{13,19}/);
  expect(SEED.memberships[0].monthlyAmountCents).toBe(8000);
});
```

- [ ] **Step 2: Run — expect FAIL**

```powershell
npm test -- __tests__/demoStore.payment.test.ts
```

- [ ] **Step 3: Implement seed + store**

`demoStore.ts` keys: `@ymca/demo-state`. `loadStore` if missing calls `resetStore`. `resetStore` writes deep clone of `SEED`.

Schedule ISO times should fall on/around the week of 2026-09-14 so staff Today is non-empty for that frozen date.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```powershell
git add src/protivity/seed.ts src/storage/demoStore.ts __tests__/demoStore.payment.test.ts
git commit -m "feat: add seed data and AsyncStorage demo store"
```

---

### Task 6: ProtivityPort and MockProtivityAdapter (TDD)

**Files:**
- Create: `src/protivity/ProtivityPort.ts`
- Create: `src/protivity/ProtivityNotConnected.ts`
- Create: `src/protivity/MockProtivityAdapter.ts`
- Test: `__tests__/MockProtivityAdapter.test.ts`

**Interfaces:**
- Consumes: `DemoState`, `computeCancelDates`, types
- Produces: `ProtivityPort` interface with exact methods from spec; `MockProtivityAdapter` implementing all

`ProtivityPort`:

```ts
export interface ProtivityPort {
  login(email: string, password: string): Promise<{ userId: string; role: UserRole }>;
  getMember(id: string): Promise<Member>;
  getStaff(id: string): Promise<Staff>;
  getMembership(memberId: string): Promise<Membership>;
  getSchedules(q: {
    branchId: string;
    from: string;
    to: string;
    category?: ScheduleCategory;
  }): Promise<ScheduleItem[]>;
  getStaffDay(staffId: string, date: string): Promise<ScheduleItem[]>;
  listAssignedMembers(staffId: string): Promise<Member[]>;
  getAssignedTrainer(memberId: string): Promise<Staff | null>;
  updatePaymentMethod(
    memberId: string,
    payment: { brand: string; last4: string }
  ): Promise<Membership>;
  submitCancelNotice(
    memberId: string,
    input: { reason: string; requestedAt: string }
  ): Promise<CancelRequest>;
  listPendingCancels(branchId: string): Promise<CancelRequest[]>;
  listMessages(threadId: string): Promise<Message[]>;
  listThreads(userId: string): Promise<Thread[]>;
  sendMessage(input: {
    threadId: string;
    fromId: string;
    body: string;
  }): Promise<Message>;
}
```

- [ ] **Step 1: Write failing adapter contract tests**

```ts
import { MockProtivityAdapter } from '@/protivity/MockProtivityAdapter';
import { resetStore } from '@/storage/demoStore';

beforeEach(async () => {
  await resetStore();
});

test('login returns jordan as member', async () => {
  const api = new MockProtivityAdapter();
  await expect(api.login('jordan@silverspring.ymca', 'ymca-demo')).resolves.toEqual({
    userId: 'member-jordan',
    role: 'member',
  });
});

test('bad login throws', async () => {
  const api = new MockProtivityAdapter();
  await expect(api.login('jordan@silverspring.ymca', 'wrong')).rejects.toThrow();
});

test('cancel after deadline sets pending and blocks second submit', async () => {
  const api = new MockProtivityAdapter();
  const req = await api.submitCancelNotice('member-jordan', {
    reason: 'Moving',
    requestedAt: '2026-09-14',
  });
  expect(req.lastBillDate).toBe('2026-10-12');
  expect(req.accessThrough).toBe('2026-11-11');
  const member = await api.getMember('member-jordan');
  expect(member.status).toBe('cancel_pending');
  await expect(
    api.submitCancelNotice('member-jordan', { reason: 'again', requestedAt: '2026-09-14' })
  ).rejects.toThrow(/already/i);
});

test('MockProtivityAdapter exposes all ProtivityPort methods', () => {
  const api = new MockProtivityAdapter();
  const methods = [
    'login', 'getMember', 'getStaff', 'getMembership', 'getSchedules', 'getStaffDay',
    'listAssignedMembers', 'getAssignedTrainer', 'updatePaymentMethod', 'submitCancelNotice',
    'listPendingCancels', 'listMessages', 'listThreads', 'sendMessage',
  ];
  for (const m of methods) {
    expect(typeof (api as any)[m]).toBe('function');
  }
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement MockProtivityAdapter** reading/writing via `demoStore`. On cancel: compute dates, append `CancelRequest`, set member status `cancel_pending`, set membership `lastBillDate` / `cancelEffectiveDate` = accessThrough.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```powershell
git add src/protivity __tests__/MockProtivityAdapter.test.ts
git commit -m "feat: add ProtivityPort and MockProtivityAdapter"
```

---

### Task 7: Live stub, factory, repositories, session

**Files:**
- Create: `src/protivity/LiveProtivityAdapter.ts`
- Create: `src/protivity/createProtivityClient.ts`
- Create: `src/repositories/*.ts` (all five)
- Create: `src/context/SessionContext.tsx`
- Create: `src/context/AppProviders.tsx`

**Interfaces:**
- Consumes: `ProtivityPort`
- Produces: `createProtivityClient(): ProtivityPort`; repos wrapping port + saved classes local ops; `useSession()` with `{ session, login, logout, api }`

- [ ] **Step 1: Implement LiveProtivityAdapter**

Every method throws `new ProtivityNotConnected()`.

```ts
export class ProtivityNotConnected extends Error {
  constructor() {
    super('ProtivityNotConnected');
    this.name = 'ProtivityNotConnected';
  }
}
```

- [ ] **Step 2: Factory**

```ts
export function createProtivityClient(): ProtivityPort {
  const mode = process.env.EXPO_PUBLIC_PROTIVITY_MODE ?? 'mock';
  if (mode === 'live') return new LiveProtivityAdapter();
  return new MockProtivityAdapter();
}
```

- [ ] **Step 3: Repositories**

Thin wrappers: `authRepo.login`, `membershipRepo.getMembership/updatePayment/submitCancel`, `scheduleRepo.list/getStaffDay`, `messageRepo.*`, `savedClassesRepo.list/toggle` (toggle reads/writes `DemoState.savedClasses` only).

- [ ] **Step 4: SessionContext**

Hold session in React state + AsyncStorage key `@ymca/session`. On login call `api.login`. Provide `api` from factory once at provider mount.

- [ ] **Step 5: Wire AppProviders in `app/_layout.tsx`**

- [ ] **Step 6: Commit**

```powershell
git add src/protivity src/repositories src/context app/_layout.tsx
git commit -m "feat: wire Protivity factory, repos, and session"
```

---

### Task 8: Shared UI components

**Files:**
- Create: `src/components/YHeader.tsx`, `BillingHero.tsx`, `ErrorBanner.tsx`, `ScheduleRow.tsx`, `MessageThread.tsx`, `PrimaryButton.tsx`, `TextField.tsx`

**Interfaces:**
- Consumes: theme colors
- Produces: reusable presentational components used by member/staff screens

- [ ] **Step 1: Implement YHeader** with scarlet bar, white triangle, wordmark `YMCA SILVER SPRING`, optional subtitle.

- [ ] **Step 2: BillingHero** props: `nextBillingDateLabel` (e.g. `Oct 12`), `subtitle` (`Adult · $80.00 · Visa ••4242`). Dark near-black card.

- [ ] **Step 3: ErrorBanner** props: `message`, `onRetry?`. Default message: `Couldn't reach membership services`.

- [ ] **Step 4: Remaining components** — ScheduleRow (time, title, location, instructor, starred, onToggleStar); MessageThread (messages + composer); PrimaryButton; TextField.

- [ ] **Step 5: Commit**

```powershell
git add src/components
git commit -m "feat: add shared YMCA UI components"
```

---

### Task 9: Login + auth routing

**Files:**
- Create/Modify: `app/index.tsx`, `app/login.tsx`, `app/_layout.tsx`

**Interfaces:**
- Consumes: `useSession`, `authRepo`
- Produces: unauthenticated → login; member → `/(member)/home`; staff → `/(staff)/today`

- [ ] **Step 1: Login screen** with email/password, error “Check email or password.”, two fill buttons for Jordan and Alex (password `ymca-demo`).

- [ ] **Step 2: index redirect** based on session role.

- [ ] **Step 3: Manual check** — `npm start`, fill Jordan, lands on member tabs (stub screens OK until Task 10).

- [ ] **Step 4: Commit**

```powershell
git add app
git commit -m "feat: add login and role-based routing"
```

---

### Task 10: Member tabs — Home, Schedules, saved classes

**Files:**
- Create: `app/(member)/_layout.tsx`, `home.tsx`, `schedules.tsx`

**Interfaces:**
- Consumes: membershipRepo, scheduleRepo, savedClassesRepo, BillingHero, getDemoToday
- Produces: Home wallet + Schedules filters + star persistence

- [ ] **Step 1: Member tab layout** — tabs Home, Schedules, Trainers, Account (Trainers/Account can be placeholders for one commit if needed; prefer full stubs with title).

- [ ] **Step 2: Home** — load membership + member; format Oct 12; show hours; list saved classes resolved against schedules.

- [ ] **Step 3: Schedules** — segments Group Exercise / Swim / Child Watch / Events; star toggle; footer: “To enroll in programs, use Program Enrollment on ymcadc.org.” Empty: “No classes in this view.”

- [ ] **Step 4: Manual verify** — save BodyPump, see it on Home.

- [ ] **Step 5: Commit**

```powershell
git add app/(member)
git commit -m "feat: add member Home wallet and Schedules"
```

---

### Task 11: Trainers messaging (member)

**Files:**
- Create: `app/(member)/trainers.tsx`
- Modify: `MessageThread` if needed

**Interfaces:**
- Consumes: `getAssignedTrainer`, `listThreads`, `listMessages`, `sendMessage`
- Produces: trainer card + thread; empty assignment shows “Wellness desk”

- [ ] **Step 1: Implement trainers screen** — if trainer null, title Wellness desk and still use/create a staff-routed thread (seed always has Alex; implement null UI branch anyway).

Empty thread copy: “Say hello to Alex.” (or Wellness desk).

- [ ] **Step 2: Send message** — appears immediately in list.

- [ ] **Step 3: Commit**

```powershell
git add app/(member)/trainers.tsx
git commit -m "feat: add member trainer messaging"
```

---

### Task 12: Account, update payment, cancel, about

**Files:**
- Create: `app/(member)/account.tsx`, `update-payment.tsx`, `cancel.tsx`, `about.tsx`

**Interfaces:**
- Consumes: tokenizePayment, membershipRepo, computeCancelDates, getDemoToday, resetStore

- [ ] **Step 1: Account** — profile, membership ID/type/status, payment row, links to update payment / cancel / about. If `cancel_pending`, show “Cancellation requested — last bill Oct 12, access through Nov 11.” (format from membership/cancel request).

- [ ] **Step 2: Update payment** — fields name, number, expiry, CVC; validate; tokenize; call `updatePaymentMethod` with brand+last4 only; navigate back; Home/Account show new last4.

- [ ] **Step 3: Cancel flow** — prefill handbook fields; reason; confirm screen with computed dates using `getDemoToday()`; submit; block second submit with existing dates.

- [ ] **Step 4: About** — prototype disclaimer + **Reset demo data** (clear store + session, reload seed).

- [ ] **Step 5: Manual verify** cancel + payment paths.

- [ ] **Step 6: Commit**

```powershell
git add app/(member)
git commit -m "feat: add account, payment update, cancel, and about"
```

---

### Task 13: Staff tabs — Today, Members, Messages, Me

**Files:**
- Create: `app/(staff)/_layout.tsx`, `today.tsx`, `members.tsx`, `members/[id].tsx`, `messages/index.tsx`, `messages/[threadId].tsx`, `me.tsx`

**Interfaces:**
- Consumes: getStaffDay, listPendingCancels, listAssignedMembers, listThreads, sendMessage
- Produces: thin staff mode per spec (read-only schedule, visible cancels, reply)

- [ ] **Step 1: Staff tab layout** — Today | Members | Messages | Me

- [ ] **Step 2: Today** — Alex’s classes for `getDemoToday()`; pending cancel list.

- [ ] **Step 3: Members** — search filter; Jordan row with type/status/next bill; detail + thread shortcut.

- [ ] **Step 4: Messages** — inbox; open thread; reply.

- [ ] **Step 5: Me** — name, role, branch, log out.

- [ ] **Step 6: End-to-end manual pitch** — Jordan message → logout → Alex sees + replies → Jordan sees reply; cancel visible on Today.

- [ ] **Step 7: Commit**

```powershell
git add app/(staff)
git commit -m "feat: add staff Today, Members, Messages, and Me"
```

---

### Task 14: Error banner wiring and polish

**Files:**
- Modify: screens that call the API to catch `ProtivityNotConnected` / failures
- Modify: `README.md` with 5-minute pitch checklist from spec success criteria

**Interfaces:**
- Consumes: ErrorBanner
- Produces: retryable banner on adapter failures

- [ ] **Step 1: Wrap data loads** so thrown errors surface ErrorBanner with Retry.

- [ ] **Step 2: Update README** with success-criteria checklist and note that UI clock is frozen at 2026-09-14.

- [ ] **Step 3: Run full test suite**

```powershell
npm test
```

Expected: all unit tests PASS.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: wire service error banner and document pitch checklist"
```

---

### Task 15: Spec self-check and final verification

**Files:**
- Modify: none required unless gaps found

- [ ] **Step 1: Walk success criteria from the spec** on a simulator/device (or Expo web if native unavailable):

1. Jordan login → next bill Oct 12, Adult, $80, Visa ••4242
2. Browse filters + save class → on Home
3. Cancel → dates match after-deadline rule; not instant
4. Payment update → new last4; no PAN in storage
5. Message Alex
6. Login as Alex → Today, Members, cancel, message, reply

- [ ] **Step 2: Confirm `EXPO_PUBLIC_PROTIVITY_MODE=live` throws ProtivityNotConnected path (optional quick toggle test).

- [ ] **Step 3: Final commit only if fixes were needed**

```powershell
git status
# if clean, done; else commit fixes
```

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| Expo + TS + Expo Router | 1 |
| Branding / branch facts / hours | 1, 8, 10 |
| Demo users + password | 5, 9, README |
| Frozen demo clock 2026-09-14 | 2, 5 |
| Domain model | 2 |
| Cancel date math | 3, 12 |
| Payment tokenize / no PAN | 4, 5, 12 |
| Seed + AsyncStorage | 5 |
| ProtivityPort + Mock | 6 |
| Live stub + mode flag | 7 |
| Repos + session | 7 |
| Login / role tabs | 9–13 |
| Member Home wallet | 10 |
| Schedules view+save | 10 |
| Trainer thread | 11 |
| Account / payment / cancel / about reset | 12 |
| Staff thin mode | 13 |
| Error banner | 14 |
| Unit tests listed in spec | 3, 4, 5, 6 |
| Pitch success criteria | 15 |

## Placeholder / consistency notes

- IDs must stay: `member-jordan`, `staff-alex`, `thread-jordan-alex`, membershipId `448291`
- Password: `ymca-demo` everywhere (README + fill buttons)
- Cancel after-deadline example dates fixed: last bill `2026-10-12`, access through `2026-11-11`
