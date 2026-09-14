# YMCA Silver Spring Member & Staff App (v1)

Date: 2026-09-14
Status: Approved
Repo: empty Expo app to be created in this workspace

## Purpose

Build a pitch-ready iOS/Android prototype that looks like an official YMCA Silver Spring (YMCA of Metropolitan Washington) member app. Members can open their account, see the next billing date, browse and save branch schedules, request cancellation under current YMCA DC policy, update a payment method on file (token/last4 only), and message their assigned trainer. Staff/trainers can see their day, assigned members, pending cancel requests, and reply to threads.

Until YMCA / Protivity grants API access, every membership, billing, schedule, and roster call goes through a typed adapter backed by seed data. Switching on the live adapter later must not require rewriting screens.

This is a prototype for demonstration. It must not be published to the App Store or Play Store as an official YMCA product without written authorization from YMCA of Metropolitan Washington.

## Success criteria

A reviewer can, on one device, in under five minutes:

1. Log in as member Jordan Hale and see **next billing date Oct 12**, Adult membership, $80.00, Visa ••4242.
2. Browse Group Exercise / Swim / Child Watch / Events and save at least one class; saved classes appear on Home.
3. Submit a cancel notice and see a non-instant effective date that matches the one-month rule.
4. Update payment and see a new last4 with no full card number stored.
5. Send a message to trainer Alex Rivera.
6. Log out, log in as Alex, see today’s assignments, Jordan in Members, the cancel request, and the message, then reply.

## Non-goals (v1)

- Live Protivity, Daxko, GroupEx Pro, or Jotform integration
- Real card/ACH collection or PCI-compliant vaulting
- Instant membership termination
- In-app program registration or checkout
- Two-device / cloud sync (Firebase)
- Staff creating or editing the master class schedule
- Child care check-in, guest passes, donations, multi-branch account management
- App Store / Play Store release as an official Y product

Those belong in later specs after API permission and association sign-off.

## Users

Two seeded demo accounts. Same app; role comes from the account, not a hidden switcher.

| Role | Name | Login (demo) | Home branch |
| --- | --- | --- | --- |
| Member | Jordan Hale | jordan@silverspring.ymca | YMCA Silver Spring |
| Staff / trainer | Alex Rivera | alex@silverspring.ymca | YMCA Silver Spring |

Shared demo password lives in README and in the login screen’s two “Fill demo account” buttons. Member ID for Jordan: `448291`. Membership: Adult, $80.00/month, next billing **2026-10-12**, payment Visa last4 `4242`, status `active`. Jordan’s seed profile includes a fictional Silver Spring mailing address and phone so the cancel form can pre-fill handbook-required fields.

Alex is Jordan’s assigned personal wellness trainer and teaches at least one Group Exercise class on the seeded week.

## Branding

Visual identity matches an official YMCA Silver Spring product:

- YMCA scarlet `#C8102E`, near-black `#1D1D1F`, off-white `#F4F1EE`, white surfaces
- Triangle / Y mark in the header
- Wordmark: **YMCA SILVER SPRING**
- Branch facts from the public site: 9800 Hastings Drive, Silver Spring, MD 20901; (301) 585-2120; silverspring@ymcadc.org
- Hours: Mon–Fri 5:30am–10pm; Sat 7am–8pm; Sun 8am–8pm

Settings / About includes one quiet line: “Prototype — not an official published YMCA app.” Home does not show a watermark.

## Platform

- Expo (React Native) + TypeScript + Expo Router
- iOS and Android from one codebase
- No separate staff web app in v1
- Persistence: AsyncStorage on device
- State: repositories + a single `ProtivityPort` implementation injected at app start

## Information architecture

Member tabs: **Home · Schedules · Trainers · Account**

Staff tabs: **Today · Members · Messages · Me**

Login is the only way to change role.

### Member Home (membership wallet)

Red header: YMCA SILVER SPRING + greeting.

Hero card (dark): label **Next billing date**, large date **Oct 12**, subtitle `Adult · $80.00 · Visa ••4242`.

Below: today’s hours and address; **Your saved classes**; compact membership status + ID.

### Schedules

Segmented filters: Group Exercise, Swim, Child Watch, Events. Day list with time, title, location, instructor. Star saves/unsaves. Footer copy: “To enroll in programs, use Program Enrollment on ymcadc.org.” No RSVP, waitlist, or checkout.

### Trainers

Jordan sees Alex’s card (name, role Personal Wellness, branch) and an in-app thread. Composer sends a text message stored locally. If a member had no assignment, the screen still opens a thread titled “Wellness desk” routed to staff inbox (seed always assigns Alex, but the empty-assignment UI exists).

### Account

Profile name/email; membership ID, type, status; payment method row; **Update payment method**; **Cancel membership**; About.

### Staff Today

Alex’s classes/shifts for the selected day; list of pending cancel requests (Jordan after submit).

### Staff Members

Search; Jordan row shows type, status, next bill; tap opens profile + thread shortcut.

### Staff Messages

Inbox of threads; open and reply.

### Staff Me

Name, role, branch, log out.

## Member flows

### Login

Email + password, or two demo fill buttons. Invalid credentials: inline error “Check email or password.” Success routes to the role’s tab root.

### Update payment

Form: name on card, number, expiry, CVC. On submit the client validates Luhn/format, derives `brand` + `last4`, discards number and CVC immediately, calls `updatePaymentMethod`. Success replaces the Account and Home payment line. Never write PAN or CVC to AsyncStorage, logs, or seed files.

### Cancel membership (YMCA DC policy)

Not instant. Matches the association rule: written notice **one calendar month before** the monthly draft.

Definitions:

- `nextBillingDate` — next draft on the membership
- `noticeDeadline` — `nextBillingDate` minus one calendar month
- If `requestedAt` date is **on or before** `noticeDeadline`: this next draft does not occur. `lastBillDate` is the previous draft (or “none remaining” if none). `accessThrough` is the day before `nextBillingDate`.
- If `requestedAt` is **after** `noticeDeadline`: the upcoming draft still runs. `lastBillDate` = `nextBillingDate`. `accessThrough` = `nextBillingDate` plus one calendar month minus one day.

Worked example used in seed and tests: today is 2026-09-14, `nextBillingDate` is 2026-10-12, `noticeDeadline` is 2026-09-12. Jordan submits on 2026-09-14 (after deadline) → last bill **Oct 12**, access through **Nov 11**, status `cancel_pending`. Home hero stays “Next billing date Oct 12” until that draft, and Account shows “Cancellation requested — last bill Oct 12, access through Nov 11.”

Form pre-fills name, membership ID, address, phone, email. Member adds a reason. Confirm screen shows the computed dates before submit. Second submit while `cancel_pending` is blocked; show existing dates.

### Message trainer

Open Trainers → thread → send. Message appears immediately for Jordan. After logout/login as Alex, the same thread is in Messages (same device store).

## Staff flows

Alex does not create or edit the master schedule. Today is read-only for classes. Replies use `sendMessage`. Pending cancels are visible, not approvable in v1 (request is already the policy action).

## Protivity adapter

Screens call repositories. Repositories call `ProtivityPort`. UI never imports mock vs live.

```
Screens → Repositories → ProtivityPort
                           ├ MockProtivityAdapter (v1)
                           └ LiveProtivityAdapter (stub until credentials)
```

Config flag `EXPO_PUBLIC_PROTIVITY_MODE=mock|live` selects the implementation at startup. `live` without credentials throws `ProtivityNotConnected` on every call.

### `ProtivityPort` methods

- `login(email, password) → { userId, role }` where role is `member` or `staff`
- `getMember(id) → Member`
- `getStaff(id) → Staff`
- `getMembership(memberId) → Membership`
- `getSchedules({ branchId, from, to, category? }) → ScheduleItem[]`
- `getStaffDay(staffId, date) → ScheduleItem[]`
- `listAssignedMembers(staffId) → Member[]`
- `getAssignedTrainer(memberId) → Staff | null`
- `updatePaymentMethod(memberId, { brand, last4 }) → Membership`
- `submitCancelNotice(memberId, { reason, requestedAt }) → CancelRequest`
- `listPendingCancels(branchId) → CancelRequest[]`
- `listMessages(threadId) → Message[]`
- `listThreads(userId) → Thread[]`
- `sendMessage({ threadId, fromId, body }) → Message`

Saved classes are **app-local** (`SavedClass` in AsyncStorage), not Protivity, until a live favorites API exists.

Chat is **app-local** for v1. The port still exposes message methods so a future Protivity or other backend can replace the mock without new screens.

### Seed content

- Branch `silver-spring` as above
- One week of Group Exercise, swim, Child Watch, and at least one branch event, with Silver Spring-like names (BodyPump, Yoga Flow, Aqua Fit, Cycle)
- GroupEx Pro remains the real-world schedule source; v1 does not scrape it

## Data model

- `Member`: id, name, email, phone, address, membershipId, homeBranchId, type, status (`active` | `cancel_pending`)
- `Staff`: id, name, email, roleLabel, homeBranchId
- `Membership`: memberId, rateName, monthlyAmountCents, nextBillingDate, paymentBrand, paymentLast4, cancelEffectiveDate?, lastBillDate?
- `ScheduleItem`: id, branchId, category (`groupEx` | `swim` | `childWatch` | `event`), title, start, end, location, instructorName, staffId?
- `SavedClass`: memberId, scheduleItemId
- `TrainerAssignment`: memberId, staffId
- `Thread`: id, memberId, staffId
- `Message`: id, threadId, fromId, body, createdAt
- `CancelRequest`: id, memberId, reason, requestedAt, lastBillDate, accessThrough, status (`submitted`)

IDs are stable strings in seed data so screenshots and tests stay deterministic.

## Persistence

On launch, if AsyncStorage is empty, copy seed JSON into the store. Subsequent payment, cancel, save, and message writes update the store only. About includes **Reset demo data**, which restores seed (needed between pitch run-throughs).

The UI clock is frozen at **2026-09-14** while seeded `nextBillingDate` is **2026-10-12**, so the pitch does not break if the real calendar moves. Reset demo data also resets that clock. Live adapter work later will use the real device date.

## Errors

| Situation | Behavior |
| --- | --- |
| Bad login | Inline “Check email or password.” |
| Invalid payment form | Inline field errors; no adapter call |
| Cancel already pending | Block submit; show existing last bill / access through |
| `ProtivityNotConnected` or adapter throw | Banner “Couldn’t reach membership services” + Retry |
| Empty schedule filter | “No classes in this view.” |
| Empty thread | “Say hello to Alex.” (or “Wellness desk” if unassigned) |
| Device offline | Same banner if a call fails; mock reads local store so the happy path still works |

## Testing

- Unit: cancel date math for both before-deadline and after-deadline cases, including the Sep 14 / Oct 12 → Nov 11 example
- Unit: payment tokenizer returns brand+last4 and the persistence layer never contains a 13–19 digit PAN
- Unit: `MockProtivityAdapter` satisfies `ProtivityPort` (every method present and typed)
- Screen: member login → Home shows Oct 12 and $80.00
- Screen: save class → appears on Home
- Screen: cancel → Account shows cancel_pending copy; second submit blocked
- Screen: send message as Jordan → login as Alex → message visible → reply visible after switching back

No live API tests in v1.

## Follow-on work (not this spec)

1. `LiveProtivityAdapter` once credentials and API docs exist
2. Optional Firebase so member phone and trainer phone sync
3. Staff master schedule editing
4. Mock or live program registration
5. Membership hold (freeze) request
6. Official store listing only with YMCA of Metropolitan Washington authorization

## Implementation note

Do not implement until this spec is approved and an implementation plan is written from it.
