import { addDaysToDate, SEED_ANCHOR_MONDAY } from '@/domain/demoClock';
import type {
  Announcement,
  AppNotification,
  ClassForumPost,
  ClassRegistration,
  ClientFitnessGoal,
  ClientWorkoutLog,
  ComplaintSuggestion,
  Donation,
  EnrollmentCampaign,
  ForumReply,
  ForumTopic,
  ForumTopicCategory,
  Lead,
  Member,
  MemberContact,
  Membership,
  Message,
  NotificationType,
  PrivateLesson,
  SavedClass,
  ScheduleItem,
  SessionRequest,
  SupportTicket,
  SwimClassEnrollment,
  Thread,
  TrainerAssignment,
  WorkoutExercise,
} from '@/domain/types';
import type { SeedState } from './seed';

/**
 * Additional demo content layered on top of the base seed. Every date is written as a day offset from
 * the authoring anchor (Monday 2026-09-14) and is moved to the current week when the store loads.
 */

const BRANCH = 'silver-spring';

/** ISO timestamp `day` days from the anchor Monday, at local time `hm` ("HH:MM"). */
function at(day: number, hm: string): string {
  return `${addDaysToDate(SEED_ANCHOR_MONDAY, day)}T${hm}:00-04:00`;
}
function on(day: number): string {
  return addDaysToDate(SEED_ANCHOR_MONDAY, day);
}

// ---------------------------------------------------------------------------------------------
// Members and memberships
// ---------------------------------------------------------------------------------------------

type PlanName =
  | 'Adult'
  | 'Family I'
  | 'Family II'
  | 'Senior Adult'
  | 'Senior Family'
  | 'Young Adult'
  | 'Youth'
  | 'Pickleball Only Adult'
  | 'Pickleball Only Senior';

const PLAN_PRICE: Record<PlanName, number> = {
  Adult: 8900,
  'Family I': 9900,
  'Family II': 11900,
  'Senior Adult': 6500,
  'Senior Family': 9500,
  'Young Adult': 6900,
  Youth: 5500,
  'Pickleball Only Adult': 5900,
  'Pickleball Only Senior': 5000,
};

type Person = {
  id: string;
  name: string;
  birth: string;
  role?: 'primary' | 'adult' | 'dependent';
  email?: string;
  allergies?: string;
};

type Household = {
  plan: PlanName;
  address: string;
  phone: string;
  brand: string;
  last4: string;
  /** Day offset of the next billing date. */
  nextBill: number;
  joined: number;
  status?: Member['status'];
  billing?: { reason: string; failedDay: number; attempts: number; kind: 'declined' | 'past_due' };
  cancelOn?: number;
  campaignId?: string;
  people: Person[];
};

const HOUSEHOLDS: Household[] = [
  {
    plan: 'Family II',
    address: '418 Sligo Creek Pkwy, Silver Spring, MD 20910',
    phone: '(301) 555-0411',
    brand: 'Visa',
    last4: '5521',
    nextBill: 9,
    joined: -1180,
    people: [
      { id: 'member-rivera-daniel', name: 'Daniel Rivera', birth: '1981-03-22', role: 'primary', email: 'daniel.rivera@example.com' },
      { id: 'member-rivera-carmen', name: 'Carmen Rivera', birth: '1983-09-30', role: 'adult', email: 'carmen.rivera@example.com' },
      { id: 'child-rivera-lucia', name: 'Lucia Rivera', birth: '2013-01-18', role: 'dependent' },
      { id: 'child-rivera-mateo', name: 'Mateo Rivera', birth: '2017-06-05', role: 'dependent', allergies: 'Tree nuts' },
    ],
  },
  {
    plan: 'Family I',
    address: '9020 Colesville Rd, Apt 3B, Silver Spring, MD 20910',
    phone: '(301) 555-0422',
    brand: 'Mastercard',
    last4: '3318',
    nextBill: 17,
    joined: -640,
    people: [
      { id: 'member-nguyen-linh', name: 'Linh Nguyen', birth: '1988-11-04', role: 'primary', email: 'linh.nguyen@example.com' },
      { id: 'child-nguyen-kevin', name: 'Kevin Nguyen', birth: '2015-02-14', role: 'dependent' },
      { id: 'child-nguyen-amy', name: 'Amy Nguyen', birth: '2018-08-29', role: 'dependent' },
    ],
  },
  {
    plan: 'Family II',
    address: '1307 Fenwick Ln, Silver Spring, MD 20910',
    phone: '(301) 555-0433',
    brand: 'Visa',
    last4: '9046',
    nextBill: 22,
    joined: -905,
    people: [
      { id: 'member-patel-arjun', name: 'Arjun Patel', birth: '1979-07-12', role: 'primary', email: 'arjun.patel@example.com' },
      { id: 'member-patel-meera', name: 'Meera Patel', birth: '1981-12-03', role: 'adult', email: 'meera.patel@example.com' },
      { id: 'child-patel-anika', name: 'Anika Patel', birth: '2012-04-21', role: 'dependent' },
      { id: 'child-patel-rohan', name: 'Rohan Patel', birth: '2019-10-08', role: 'dependent' },
    ],
  },
  {
    plan: 'Family I',
    address: '2214 University Blvd W, Silver Spring, MD 20902',
    phone: '(301) 555-0444',
    brand: 'Visa',
    last4: '2750',
    nextBill: 4,
    joined: -330,
    people: [
      { id: 'member-robinson-tamika', name: 'Tamika Robinson', birth: '1985-05-17', role: 'primary', email: 'tamika.robinson@example.com' },
      { id: 'child-robinson-jaylen', name: 'Jaylen Robinson', birth: '2010-09-02', role: 'dependent' },
      { id: 'child-robinson-zoe', name: 'Zoe Robinson', birth: '2014-12-19', role: 'dependent', allergies: 'Penicillin' },
    ],
  },
  {
    plan: 'Senior Family',
    address: '7 Philadelphia Ave, Takoma Park, MD 20912',
    phone: '(301) 555-0455',
    brand: 'Discover',
    last4: '6103',
    nextBill: 12,
    joined: -1620,
    people: [
      { id: 'member-kowalski-walter', name: 'Walter Kowalski', birth: '1952-01-26', role: 'primary', email: 'walter.kowalski@example.com' },
      { id: 'member-kowalski-barbara', name: 'Barbara Kowalski', birth: '1954-06-09', role: 'adult', email: 'barbara.kowalski@example.com' },
    ],
  },
  {
    plan: 'Family I',
    address: '640 Quebec Ter, Silver Spring, MD 20903',
    phone: '(301) 555-0466',
    brand: 'Visa',
    last4: '8812',
    nextBill: 2,
    joined: -75,
    status: 'active',
    billing: { reason: 'Card declined: insufficient funds', failedDay: -7, attempts: 2, kind: 'declined' },
    people: [
      { id: 'member-hassan-omar', name: 'Omar Hassan', birth: '1987-03-30', role: 'primary', email: 'omar.hassan@example.com' },
      { id: 'child-hassan-yasmin', name: 'Yasmin Hassan', birth: '2016-11-11', role: 'dependent' },
    ],
  },
];

type Single = {
  id: string;
  name: string;
  plan: PlanName;
  birth: string;
  address: string;
  brand: string;
  last4: string;
  nextBill: number;
  joined: number;
  status?: Member['status'];
  billing?: Household['billing'];
  cancelOn?: number;
  campaignId?: string;
};

const SINGLES: Single[] = [
  { id: 'member-vasquez-elena', name: 'Elena Vasquez', plan: 'Adult', birth: '1992-08-14', address: '8100 Georgia Ave, Apt 12, Silver Spring, MD 20910', brand: 'Visa', last4: '1190', nextBill: 6, joined: -420 },
  { id: 'member-carter-devon', name: 'Devon Carter', plan: 'Adult', birth: '1995-02-03', address: '1120 Spring St, Apt 404, Silver Spring, MD 20910', brand: 'Visa', last4: '4417', nextBill: 1, joined: -210, billing: { reason: 'Card declined: do not honor', failedDay: -4, attempts: 1, kind: 'declined' } },
  { id: 'member-adeyemi-priscilla', name: 'Priscilla Adeyemi', plan: 'Adult', birth: '1979-10-27', address: '305 Sligo Ave, Silver Spring, MD 20910', brand: 'Mastercard', last4: '6620', nextBill: -9, joined: -980, billing: { reason: 'Card expired', failedDay: -9, attempts: 3, kind: 'past_due' } },
  { id: 'member-gallagher-tom', name: 'Tom Gallagher', plan: 'Senior Adult', birth: '1955-04-18', address: '14 Maple Ave, Takoma Park, MD 20912', brand: 'Visa', last4: '2208', nextBill: 14, joined: -1500 },
  { id: 'member-briggs-harold', name: 'Harold Briggs', plan: 'Senior Adult', birth: '1948-12-02', address: '9701 Brunett Ave, Silver Spring, MD 20901', brand: 'Visa', last4: '7731', nextBill: 19, joined: -2100 },
  { id: 'member-sullivan-margaret', name: 'Margaret Sullivan', plan: 'Senior Adult', birth: '1950-09-21', address: '8601 Piney Branch Rd, Silver Spring, MD 20901', brand: 'Visa', last4: '0925', nextBill: 11, joined: -1780 },
  { id: 'member-cho-aiden', name: 'Aiden Cho', plan: 'Young Adult', birth: '2005-06-30', address: '1400 Fenwick Ln, Apt 7, Silver Spring, MD 20910', brand: 'Visa', last4: '3374', nextBill: 8, joined: -260 },
  { id: 'member-marchetti-sofia', name: 'Sofia Marchetti', plan: 'Young Adult', birth: '2004-01-15', address: '525 Wayne Ave, Silver Spring, MD 20910', brand: 'Mastercard', last4: '8456', nextBill: 24, joined: -150 },
  { id: 'member-okoye-jasmine', name: 'Jasmine Okoye', plan: 'Youth', birth: '2010-03-09', address: '3 Dale Dr, Silver Spring, MD 20910', brand: 'Visa', last4: '5502', nextBill: 15, joined: -400 },
  { id: 'member-foster-caleb', name: 'Caleb Foster', plan: 'Youth', birth: '2009-07-24', address: '902 Kennebec St, Takoma Park, MD 20912', brand: 'Visa', last4: '1766', nextBill: 21, joined: -95 },
  { id: 'member-feldman-naomi', name: 'Naomi Feldman', plan: 'Adult', birth: '1986-05-06', address: '58 Cedar St, Takoma Park, MD 20912', brand: 'Visa', last4: '9034', nextBill: 5, joined: -730 },
  { id: 'member-tran-brian', name: 'Brian Tran', plan: 'Adult', birth: '1990-09-18', address: '1230 East West Hwy, Apt 210, Silver Spring, MD 20910', brand: 'Mastercard', last4: '4281', nextBill: 26, joined: -560, status: 'paused' },
  { id: 'member-kim-rachel', name: 'Rachel Kim', plan: 'Adult', birth: '1984-11-22', address: '417 Grove St, Silver Spring, MD 20910', brand: 'Visa', last4: '7119', nextBill: 13, joined: -1010 },
  { id: 'member-washington-isaiah', name: 'Isaiah Washington', plan: 'Adult', birth: '1998-03-12', address: '8403 Cameron St, Apt 6, Silver Spring, MD 20910', brand: 'Visa', last4: '6648', nextBill: 16, joined: -300, status: 'cancel_pending', cancelOn: 16 },
  { id: 'member-mendez-gloria', name: 'Gloria Mendez', plan: 'Senior Adult', birth: '1957-08-05', address: '11 Spruce St, Silver Spring, MD 20910', brand: 'Visa', last4: '3005', nextBill: 3, joined: -35, campaignId: 'camp-fall-2026' },
  { id: 'member-ortega-luis', name: 'Luis Ortega', plan: 'Pickleball Only Adult', birth: '1975-02-28', address: '9900 Georgia Ave, Silver Spring, MD 20902', brand: 'Visa', last4: '2417', nextBill: -3, joined: -520, billing: { reason: 'Card declined: insufficient funds', failedDay: -3, attempts: 1, kind: 'declined' } },
  { id: 'member-park-dennis', name: 'Dennis Park', plan: 'Pickleball Only Senior', birth: '1953-10-14', address: '2 Seminary Pl, Silver Spring, MD 20910', brand: 'Discover', last4: '8870', nextBill: 18, joined: -610 },
  { id: 'member-bell-tasha', name: 'Tasha Bell', plan: 'Adult', birth: '1993-01-09', address: '801 Silver Spring Ave, Apt 5, Silver Spring, MD 20910', brand: 'Visa', last4: '3221', nextBill: 10, joined: -18, campaignId: 'camp-fall-2026' },
];

let membershipSeq = 561001;
function nextMembershipId(): string {
  return String(membershipSeq++);
}

function buildPeople(): { members: Member[]; memberships: Membership[] } {
  const members: Member[] = [];
  const memberships: Membership[] = [];

  const membership = (
    memberId: string,
    plan: PlanName,
    h: Pick<Household, 'brand' | 'last4' | 'nextBill' | 'joined' | 'status' | 'billing' | 'cancelOn' | 'campaignId'>
  ): Membership => {
    const m: Membership = {
      memberId,
      rateName: plan,
      monthlyAmountCents: PLAN_PRICE[plan],
      nextBillingDate: on(h.nextBill),
      lastBillDate: on(h.nextBill - 28),
      paymentBrand: h.brand,
      paymentLast4: h.last4,
      status: h.status ?? 'active',
      billingStatus: h.billing ? h.billing.kind : 'current',
      joinedDate: on(h.joined),
    };
    if (h.billing) {
      m.billingIssue = {
        reason: h.billing.reason,
        failedAt: at(h.billing.failedDay, '03:00'),
        amountDueCents: PLAN_PRICE[plan],
        attempts: h.billing.attempts,
      };
    }
    if (h.cancelOn !== undefined) m.cancelEffectiveDate = on(h.cancelOn);
    if (h.campaignId) m.campaignId = h.campaignId;
    return m;
  };

  for (const h of HOUSEHOLDS) {
    const primary = h.people.find((p) => p.role === 'primary') ?? h.people[0];
    for (const p of h.people) {
      members.push({
        id: p.id,
        name: p.name,
        email: p.email ?? '',
        phone: h.phone,
        address: h.address,
        membershipId: nextMembershipId(),
        homeBranchId: BRANCH,
        type: h.plan,
        status: h.status ?? 'active',
        birthDate: p.birth,
        householdId: primary.id,
        householdRole: p.role ?? 'adult',
        hasLogin: false,
        ...(p.allergies ? { allergies: p.allergies } : {}),
      });
    }
    memberships.push(membership(primary.id, h.plan, h));
  }

  let phoneSeq = 500;
  for (const s of SINGLES) {
    members.push({
      id: s.id,
      name: s.name,
      email: `${s.name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')}@example.com`,
      phone: `(301) 555-0${phoneSeq++}`,
      address: s.address,
      membershipId: nextMembershipId(),
      homeBranchId: BRANCH,
      type: s.plan,
      status: s.status ?? 'active',
      birthDate: s.birth,
      hasLogin: false,
    });
    memberships.push(membership(s.id, s.plan, s));
  }
  return { members, memberships };
}

// ---------------------------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------------------------

type Line = ['m' | 's', string, number, string];
type Conversation = { id: string; memberId: string; staffId: string; lines: Line[] };

const CONVERSATIONS: Conversation[] = [
  {
    id: 'thread-jordan-alex',
    memberId: 'member-jordan',
    staffId: 'staff-alex',
    lines: [
      ['s', 'Great session today, John. Your squat depth is a lot better. Keep doing the band warm-ups before pressing days.', -9, '16:10'],
      ['m', 'Thanks Doc! My left shoulder felt looser today.', -9, '17:02'],
      ['s', 'Reminder to log your three workouts this week. Even a 20 minute swim counts.', -4, '09:20'],
      ['m', 'Will do. I hit BodyPump Monday and swam Friday, so one more to go.', -4, '12:48'],
      ['s', 'Nice. Come find me Wednesday and we will go over your deadlift setup.', -1, '18:05'],
      ['m', 'Sounds good. See you then.', 0, '07:15'],
    ],
  },
  {
    id: 'thread-jordan-sarah',
    memberId: 'member-jordan',
    staffId: 'staff-sarah',
    lines: [
      ['m', 'Hi Jane! Mia is in Pre Stage 1 on Saturdays. Is there a makeup if we miss one?', 0, '09:05'],
      ['s', 'Yes, each 8 week session includes one makeup. Tell the desk which date you missed and we will find a spot.', 0, '09:40'],
      ['m', 'Perfect, thank you.', 0, '09:45'],
    ],
  },
  {
    id: 'thread-jordan-elena',
    memberId: 'member-jordan',
    staffId: 'staff-elena',
    lines: [
      ['s', 'Hi John, this is Emily from Aquatics. Mia did great at her trial lesson. I would suggest Pre Stage 1 on Saturday mornings.', -6, '14:00'],
      ['m', 'That works for us. Is there room in the 8:00 AM class?', -6, '19:30'],
      ['s', 'Yes, two spots left. I held one for Mia and will confirm with the desk.', -5, '08:15'],
      ['m', 'Thank you, Emily!', -5, '08:40'],
    ],
  },
  {
    id: 'thread-jordan-desk',
    memberId: 'member-jordan',
    staffId: 'staff-desk',
    lines: [
      ['m', 'Thanks! Quick question, can I add Jane to my account in the app?', 0, '08:20'],
      ['s', 'Absolutely. Open Family from the Account tab to add adults and kids. Jane already has a login, so she will see everything on her side.', 0, '08:35'],
      ['m', 'Got it, thank you.', 0, '08:41'],
    ],
  },
  {
    id: 'thread-riley-alex',
    memberId: 'member-riley',
    staffId: 'staff-alex',
    lines: [
      ['m', 'Hi Doc, I am training for the Silver Spring 10K and want more leg strength. Do you have time for an intro session?', -8, '18:20'],
      ['s', 'Hi Riley! Love that. Let us do a 60 minute intro and go through your running history.', -8, '19:05'],
      ['m', 'I booked Tuesday at 2:00.', -7, '07:40'],
      ['s', 'Perfect. Wear shoes you would squat in, not your running shoes.', -7, '08:10'],
    ],
  },
  {
    id: 'thread-riley-frontdesk',
    memberId: 'member-riley',
    staffId: 'staff-frontdesk',
    lines: [
      ['s', 'Hi Riley, this is Liz at the front desk. The card ending in 1881 was declined on the 10th. You can update it under Account, then Payment.', -3, '15:10'],
      ['m', 'Oh no, I changed banks last month. I will update it tonight.', -3, '19:45'],
      ['s', 'Thanks! Let me know if it does not go through and we can take it at the desk.', -2, '08:30'],
    ],
  },
  {
    id: 'thread-sam-frontdesk',
    memberId: 'member-sam',
    staffId: 'staff-frontdesk',
    lines: [
      ['s', 'Hi Sam, the Mastercard on your Family I plan expired and September did not go through. Can you add a new card?', -12, '10:15'],
      ['m', 'Sorry about that, I did not get the email. I will stop by this week.', -12, '13:20'],
      ['s', 'No problem, we are here until 8 on weekdays.', -11, '09:00'],
    ],
  },
  {
    id: 'thread-nora-alex',
    memberId: 'member-nora',
    staffId: 'staff-alex',
    lines: [
      ['m', 'Hello Doc, my doctor suggested balance and leg strength work. Would a 30 minute session be a good start?', -10, '10:05'],
      ['s', 'Hi Nora, yes. We will keep it low impact with chair support at first and build from there.', -10, '11:20'],
      ['m', 'That sounds just right. Is Tuesday afternoon open?', -10, '11:45'],
      ['s', 'I have Tuesday at 4:00. I sent the request, you should see it as accepted.', -9, '08:00'],
      ['m', 'Got it, see you then!', -9, '08:30'],
    ],
  },
  {
    id: 'thread-devon-frontdesk',
    memberId: 'member-carter-devon',
    staffId: 'staff-frontdesk',
    lines: [
      ['s', 'Hi Devon, your membership payment did not go through on the 10th. Would you like to update the card in the app or over the phone?', -3, '14:30'],
      ['m', 'I will do it in the app. Where is that?', -3, '16:05'],
      ['s', 'Account tab, then Payment Method. Takes about a minute.', -3, '16:12'],
    ],
  },
  {
    id: 'thread-priscilla-alek',
    memberId: 'member-adeyemi-priscilla',
    staffId: 'staff-alek',
    lines: [
      ['m', 'Hi Alek, I would like to work on my freestyle breathing. Do you offer 30 minute private lessons?', -5, '12:10'],
      ['s', 'We do. Mornings are best for me. I can offer Tuesday at 7:00 or Thursday at 10:30.', -5, '14:00'],
      ['m', 'Tuesday at 7:00 works.', -5, '14:25'],
    ],
  },
  {
    id: 'thread-linh-sarah',
    memberId: 'member-nguyen-linh',
    staffId: 'staff-sarah',
    lines: [
      ['m', 'Hi Jane, Kevin finished Stage 3 and Amy is ready for Stage 1. Which Saturday classes still have space?', -4, '09:30'],
      ['s', 'Kevin can move into Stage 4 at 8:40. For Amy, the 12:00 Pre Stage 1 has room. I will hold both until Friday.', -4, '10:45'],
      ['m', 'That would be perfect. I will enroll tonight.', -4, '11:10'],
    ],
  },
  {
    id: 'thread-naomi-alex',
    memberId: 'member-feldman-naomi',
    staffId: 'staff-alex',
    lines: [
      ['m', 'Hi Doc, I have had some lower back stiffness from desk work. Can we focus on core and mobility?', -6, '08:50'],
      ['s', 'Definitely. I will build a plan around hip mobility and anti-rotation core work. Saturday morning works for me.', -6, '12:15'],
      ['m', 'Booking it now.', -6, '12:40'],
    ],
  },
  {
    id: 'thread-tom-celine',
    memberId: 'member-gallagher-tom',
    staffId: 'staff-celine',
    lines: [
      ['m', 'Good afternoon Celine. A friend recommended Full Circle Health. Is there still room on Mondays?', -8, '14:15'],
      ['s', 'Hi Tom, yes. It meets Monday and Wednesday at 7:45 and registration is required. I can add you today.', -8, '15:00'],
      ['m', 'Please do. Thank you.', -8, '15:12'],
    ],
  },
  {
    id: 'thread-patel-desk',
    memberId: 'member-patel-arjun',
    staffId: 'staff-desk',
    lines: [
      ['m', 'Hi Billy, my mother-in-law is visiting for two weeks. What are the options for a short stay?', -2, '19:10'],
      ['s', 'Hi Arjun, a 1-Day Guest Pass is the easiest. For two weeks we also have a 14-day visitor pass at the desk. Bring a photo ID.', -1, '09:25'],
      ['m', 'Great, we will stop by Saturday.', -1, '10:05'],
    ],
  },
];

function buildThreadsAndMessages(): { threads: Thread[]; messages: Message[] } {
  const threads: Thread[] = [];
  const messages: Message[] = [];
  for (const c of CONVERSATIONS) {
    threads.push({ id: c.id, memberId: c.memberId, staffId: c.staffId });
    c.lines.forEach(([who, body, day, hm], i) => {
      messages.push({
        id: `msg-x-${c.id.replace('thread-', '')}-${i + 1}`,
        threadId: c.id,
        fromId: who === 'm' ? c.memberId : c.staffId,
        body,
        createdAt: at(day, hm),
      });
    });
  }
  return { threads, messages };
}

// ---------------------------------------------------------------------------------------------
// Notifications and announcements
// ---------------------------------------------------------------------------------------------

type NotifRow = [userId: string, type: NotificationType, title: string, body: string, day: number, hm: string, read: boolean, link?: string];

const NOTIFICATIONS: NotifRow[] = [
  ['member-jordan', 'membership', 'Payment received', 'Your Family II payment of $119.00 was processed. Thank you for being a member.', -2, '03:05', true, '/(member)/manage-membership'],
  ['member-jordan', 'staff_inquiry', 'New message from Doc', 'Come find me Wednesday and we will go over your deadlift setup.', -1, '18:05', false, '/(member)/(tabs)/staff'],
  ['member-jordan', 'general', 'Mia is enrolled in Pre Stage 1', 'Saturdays at 8:00 AM in the Indoor Pool. The first class starts this week.', -5, '08:45', true, '/(member)/book-lesson'],
  ['member-jordan', 'class_forum', 'New post in Monday BodyPump', 'Doc posted an update for the 6:00 PM class.', 0, '08:30', false, '/(member)/(tabs)/schedules'],
  ['member-jordan', 'forum_reply', 'Alek replied to your question', 'The outdoor pool stays heated through mid-November, weather permitting.', 0, '11:45', true, '/(member)/(tabs)/forum'],
  ['member-jordan', 'event', 'Healthy Kids Day Expo', 'Free for the whole family. Games, health screenings and a splash zone.', -2, '09:00', true, '/(member)/events'],
  ['member-jordan', 'announcement', 'Cycle studio has new bikes', 'All 24 bikes in the cycle studio were replaced this weekend.', -3, '10:00', true, '/(member)/(tabs)/home'],
  ['member-jordan', 'billing', 'Card on file expires soon', 'The Visa ending in 4242 expires next quarter. You can update it any time under Payment.', -6, '09:00', true, '/(member)/update-payment'],
  ['member-jordan-spouse', 'membership', 'Welcome to the Y, Jane', 'You are on the Doe family plan. Scan your pass at the front desk or the turnstile.', -20, '09:00', true, '/(member)/manage-membership'],
  ['member-jordan-spouse', 'event', 'Parents Night Out is open for sign-up', 'Drop off the kids for an evening of games and a movie while you get time to yourself.', -1, '12:00', false, '/(member)/events'],
  ['member-riley', 'billing', 'Payment declined', 'We could not process your monthly payment. Please update your card to keep your membership active.', -4, '03:10', false, '/(member)/update-payment'],
  ['member-riley', 'staff_inquiry', 'Message from Liz at the front desk', 'Let me know if the card does not go through and we can take it at the desk.', -2, '08:30', false, '/(member)/(tabs)/staff'],
  ['member-riley', 'general', 'Session confirmed with Doc', 'Tuesday at 2:00 PM on the Wellness Floor.', -7, '08:15', true, '/(member)/book-lesson'],
  ['member-nora', 'membership', 'Welcome to the Y, Nora', 'Your Senior Adult membership is active. Silver Sneakers classes are listed under Schedules.', -4, '09:30', true, '/(member)/(tabs)/schedules'],
  ['member-nora', 'general', 'Session accepted', 'Doc accepted your 30 minute session on Tuesday at 4:00 PM.', -9, '08:00', true, '/(member)/book-lesson'],
  ['member-nora', 'event', 'Fall Wellness Fair', 'Blood pressure checks, balance screenings and chair yoga demos at the branch.', -1, '10:30', false, '/(member)/events'],
  ['staff-alex', 'general', 'Client on site', 'John Doe is in the building for his 11:00 AM session.', 0, '10:45', false, '/(staff)/(tabs)/members'],
  ['staff-alex', 'staff_inquiry', 'New session request', 'Naomi Feldman requested a 60 minute training session on Saturday at 9:00 AM.', -1, '12:40', false, '/(staff)/(tabs)/schedules'],
  ['staff-alex', 'staff_inquiry', 'New session request', 'Tom Gallagher requested a 30 minute session on Tuesday at 11:00 AM.', -1, '14:05', false, '/(staff)/(tabs)/schedules'],
  ['staff-alex', 'forum_mention', 'You were mentioned in the forum', 'John Doe asked about warm-up drills before heavy squats.', -2, '14:10', true, '/(staff)/(tabs)/messages'],
  ['staff-alex', 'general', 'Session reminder', 'Devon Carter is booked Tuesday at 2:00 PM.', -1, '17:00', true, '/(staff)/(tabs)/schedules'],
  ['staff-frontdesk', 'billing', 'Billing issues need follow-up', 'Four members have declined or past-due payments this week.', 0, '07:30', false, '/(staff)/billing-issues'],
  ['staff-frontdesk', 'general', 'Leads due today', 'Three leads have follow-ups scheduled for today.', 0, '07:31', false, '/(staff)/leads'],
  ['staff-frontdesk', 'staff_inquiry', 'Message from Riley Chen', 'Oh no, I changed banks last month. I will update it tonight.', -3, '19:45', true, '/(staff)/(tabs)/messages'],
  ['staff-frontdesk', 'general', 'New lead: Priya Natarajan', 'Walk-in on Saturday. Interested in the pool and group classes.', -2, '11:05', true, '/(staff)/leads'],
  ['staff-desk', 'billing', 'Membership billing summary', 'Four accounts have billing issues. Two have been contacted.', 0, '07:00', false, '/(staff)/billing-issues'],
  ['staff-desk', 'general', 'Fall Enrollment pacing', 'Eight new members have joined under the fall joining fee waiver.', -1, '16:30', true, '/(staff)/campaigns'],
  ['staff-desk', 'staff_inquiry', 'Message from Arjun Patel', 'Asked about visitor passes for a family member.', -2, '19:10', true, '/(staff)/(tabs)/messages'],
  ['staff-alek', 'staff_inquiry', 'New session request', 'Priscilla Adeyemi requested a 30 minute swim lesson on Tuesday.', -5, '12:10', false, '/(staff)/(tabs)/schedules'],
  ['staff-alek', 'forum_mention', 'You were mentioned in the forum', 'John Doe asked whether the outdoor pool stays open through October.', -3, '11:20', true, '/(staff)/(tabs)/messages'],
  ['staff-alek', 'general', 'Lifeguard schedule review', 'The Sunday afternoon lap swim request is under review.', -1, '09:15', true, '/(staff)/complaints-suggestions'],
  ['staff-celine', 'general', 'Full Circle Health roster', 'Tom Gallagher joined the Monday and Wednesday class.', -8, '15:12', true, '/(staff)/(tabs)/schedules'],
  ['staff-celine', 'general', 'Wellness packages', 'Two members asked about the 12 session training package this week.', -2, '13:00', false, '/(staff)/(tabs)/members'],
  ['staff-admin', 'general', 'New support ticket', 'A member reported a problem with the check-in barcode brightness.', -1, '13:40', false, '/(staff)/notifications'],
  ['staff-admin', 'general', 'Survey results ready', 'The weekend class format poll reached 20 responses.', -3, '10:00', true, '/(staff)/surveys'],
  ['staff-sarah', 'staff_inquiry', 'Message from Linh Nguyen', 'Asked about Stage 4 and Pre Stage 1 availability on Saturdays.', -4, '09:30', true, '/(staff)/(tabs)/messages'],
  ['staff-sarah', 'general', 'Saturday swim roster', 'Eleven students are enrolled across your Saturday classes.', -1, '16:00', false, '/(staff)/(tabs)/schedules'],
];

function buildNotifications(): AppNotification[] {
  return NOTIFICATIONS.map(([userId, type, title, body, day, hm, read, link], i) => ({
    id: `notif-x-${i + 1}`,
    userId,
    title,
    body,
    type,
    createdAt: at(day, hm),
    read,
    ...(link ? { link } : {}),
  }));
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-cycle-bikes',
    branchId: BRANCH,
    title: 'New Bikes in the Cycle Studio',
    body: 'All 24 bikes in the cycle studio were replaced over the weekend. Stop by the front desk if you would like help setting up your seat and handlebars.',
    category: 'facility',
    priority: 'normal',
    createdAt: at(-3, '10:00'),
    authorName: 'Celine (Wellness Director)',
    actionLabel: 'View Cycle Classes',
    actionUrl: '/(member)/(tabs)/schedules',
  },
  {
    id: 'ann-kids-expo',
    branchId: BRANCH,
    title: 'Healthy Kids Day Expo',
    body: 'Free for the whole community. Games, health screenings, a splash zone and a healthy snack station for kids of all ages.',
    category: 'event',
    priority: 'normal',
    createdAt: at(-2, '09:00'),
    authorName: 'YMCA Events Committee',
    actionLabel: 'See Event Details',
    actionUrl: '/(member)/events',
  },
  {
    id: 'ann-pickleball-clinic',
    branchId: BRANCH,
    title: 'Beginner Pickleball Clinic Added',
    body: 'Thanks to member feedback, we added a 45 minute fundamentals clinic on Thursday evenings in the gym. Paddles are provided.',
    category: 'program',
    priority: 'normal',
    createdAt: at(-4, '15:30'),
    authorName: 'David (Staff Admin)',
    actionLabel: 'View Schedule',
    actionUrl: '/(member)/(tabs)/schedules',
  },
  {
    id: 'ann-child-watch-hours',
    branchId: BRANCH,
    title: 'Child Watch Evening Hours',
    body: 'Child Watch is open Monday through Friday from 4 PM to 8 PM in addition to the morning hours. Sign-in closes 30 minutes before closing.',
    category: 'program',
    priority: 'normal',
    createdAt: at(-6, '11:00'),
    authorName: 'Billy Deveaux (Membership Director)',
    actionLabel: 'Child Watch Details',
    actionUrl: '/(member)/child-watch',
  },
  {
    id: 'ann-locker-rooms',
    branchId: BRANCH,
    title: 'Locker Room Refresh Complete',
    body: 'New benches, lockers and shower fixtures are in. Please bring your own lock and remove it before you leave. Overnight locks are cut on Fridays.',
    category: 'facility',
    priority: 'normal',
    createdAt: at(-8, '08:00'),
    authorName: 'David (Staff Admin)',
  },
  {
    id: 'ann-halloween-swim',
    branchId: BRANCH,
    title: 'Halloween Family Swim Night',
    body: 'Costumes welcome in the shallow end. Pumpkin floats, glow sticks and a small prize for every swimmer. Families only, children must be accompanied.',
    category: 'event',
    priority: 'normal',
    createdAt: at(-1, '13:00'),
    authorName: 'Alek (Aquatics Director)',
    actionLabel: 'View Event',
    actionUrl: '/(member)/events',
  },
  {
    id: 'ann-wellness-fair',
    branchId: BRANCH,
    title: 'Fall Wellness Fair for Active Older Adults',
    body: 'Blood pressure checks, balance screenings and chair yoga demos with our wellness team. Light refreshments provided.',
    category: 'community',
    priority: 'normal',
    createdAt: at(-1, '10:30'),
    authorName: 'Celine (Wellness Director)',
  },
  {
    id: 'ann-holiday-hours',
    branchId: BRANCH,
    title: 'Thanksgiving Week Hours',
    body: 'The branch closes at noon the day before Thanksgiving and is closed on Thanksgiving Day. Classes and Child Watch follow the reduced schedule.',
    category: 'facility',
    priority: 'high',
    createdAt: at(-1, '16:00'),
    authorName: 'David (Staff Admin)',
  },
];

// ---------------------------------------------------------------------------------------------
// Forum
// ---------------------------------------------------------------------------------------------

type ForumReplySpec = { id: string; by: string; text: string; day: number; hm: string; likes?: number; mentions?: string[] };
type ForumTopicSpec = {
  id: string;
  title: string;
  content: string;
  category: ForumTopicCategory;
  by: string;
  day: number;
  hm: string;
  pinned?: boolean;
  likes?: number;
  likedBy?: string[];
  mentionsStaff?: string[];
  replies: ForumReplySpec[];
};

const FORUM: ForumTopicSpec[] = [
  {
    id: 'topic-welcome',
    title: 'Welcome to the YMCA Silver Spring Community Forum',
    content: 'Welcome to our community space. Share workout milestones, set up group meetups, trade fitness and nutrition tips, and ask our team questions by tagging a staff member. Please keep things respectful and supportive.',
    category: 'general',
    by: 'staff-admin',
    day: -30,
    hm: '09:00',
    pinned: true,
    likes: 18,
    likedBy: ['member-jordan', 'staff-alex'],
    replies: [
      { id: 'freply-welcome-1', by: 'member-jordan', text: 'Glad to see this up. Looking forward to connecting with other members and the trainers.', day: -30, hm: '09:40', likes: 3 },
      { id: 'freply-welcome-2', by: 'staff-alex', text: 'Our team checks in here daily. Tag @Doc or @Jane Doe any time for form advice or class questions.', day: -30, hm: '10:15', likes: 7, mentions: ['staff-sarah'] },
    ],
  },
  {
    id: 'topic-pool-winter',
    title: 'Will the outdoor pool stay open through October?',
    content: 'Hi everyone and @Alek, I heard the heated outdoor pool might stay open later this fall with the new thermal covers. Can someone on the aquatics team confirm?',
    category: 'swim',
    by: 'member-jordan',
    day: -3,
    hm: '11:20',
    likes: 9,
    likedBy: ['member-jordan'],
    mentionsStaff: ['staff-alek'],
    replies: [
      { id: 'freply-pool-1', by: 'staff-alek', text: 'Great question, John. Yes, the outdoor 25 meter pool stays heated to 81 degrees and open through November 15th, weather permitting. The solar blankets go on overnight to keep morning temperatures steady.', day: -3, hm: '11:45', likes: 8 },
      { id: 'freply-pool-2', by: 'member-jordan', text: 'That is great news, thank you Alek.', day: -3, hm: '12:05', likes: 2 },
      { id: 'freply-pool-3', by: 'member-nguyen-linh', text: 'Do the outdoor lanes open at the same time as the indoor pool on weekends?', day: -2, hm: '08:10', likes: 1 },
      { id: 'freply-pool-4', by: 'staff-alek', text: 'Outdoor lap swim opens at 8:00 on Saturdays and Sundays. Indoor opens at 7:00.', day: -2, hm: '09:00', likes: 4 },
    ],
  },
  {
    id: 'topic-squat-warmup',
    title: 'Best warm-up before heavy barbell squats?',
    content: 'Hey @Doc, I have been dealing with tight hip flexors during my morning leg sessions. What dynamic stretches and warm-up sets do you recommend before working weight?',
    category: 'fitness',
    by: 'member-jordan',
    day: -2,
    hm: '14:10',
    likes: 12,
    mentionsStaff: ['staff-alex'],
    replies: [
      { id: 'freply-squat-1', by: 'staff-alex', text: 'Hey John! Try this 5 minute routine: 90/90 hip flow for 60 seconds, the world\'s greatest stretch for 5 reps per side, a goblet squat hold for 45 seconds, then two sets of 8 with the empty bar and a 3 second pause at the bottom. Stop by the floor if you want me to check your bar path.', day: -2, hm: '15:30', likes: 6 },
      { id: 'freply-squat-2', by: 'member-feldman-naomi', text: 'This helped my hips too. The 90/90 flow is underrated.', day: -1, hm: '07:30', likes: 2 },
    ],
  },
  {
    id: 'topic-pickleball',
    title: 'Tuesday Morning Intermediate Pickleball Games',
    content: 'Looking for two more players for intermediate doubles on the indoor courts every Tuesday at 7:30 AM before work. Reply if you want to join the regular rotation.',
    category: 'community',
    by: 'member-jordan',
    day: -1,
    hm: '16:45',
    likes: 14,
    likedBy: ['member-jordan'],
    replies: [
      { id: 'freply-pb-1', by: 'member-ortega-luis', text: 'Count me in. I will bring a fresh tube of balls.', day: -1, hm: '17:10', likes: 3 },
      { id: 'freply-pb-2', by: 'member-jordan', text: 'Great, Luis. See you on Court 2 at 7:30.', day: -1, hm: '17:20', likes: 2 },
      { id: 'freply-pb-3', by: 'member-park-dennis', text: 'I play a little slower but would love to rotate in if that is okay.', day: 0, hm: '08:05', likes: 2 },
    ],
  },
  {
    id: 'topic-aoa-mobility',
    title: 'Chair Yoga and Aqua Arthritis are worth a try',
    content: 'A big thank you to @Jane Doe. The Thursday gentle chair yoga has improved my balance and shoulder mobility. If you have joint stiffness, give it a try.',
    category: 'programs',
    by: 'member-sullivan-margaret',
    day: -4,
    hm: '09:30',
    likes: 21,
    mentionsStaff: ['staff-sarah'],
    replies: [
      { id: 'freply-aoa-1', by: 'staff-sarah', text: 'Thank you, Margaret! It makes my week to see everyone getting stronger.', day: -4, hm: '10:15', likes: 5 },
      { id: 'freply-aoa-2', by: 'member-briggs-harold', text: 'Seconding this. The water classes are easier on my knees than anything else.', day: -3, hm: '12:40', likes: 4 },
    ],
  },
  {
    id: 'topic-cycle-bikes',
    title: 'New cycle bikes: how do you like them?',
    content: 'I tried the new bikes at Tuesday spin. The screens are great, but I am still figuring out the seat height. Anyone have tips?',
    category: 'facilities',
    by: 'member-vasquez-elena',
    day: -2,
    hm: '18:20',
    likes: 8,
    replies: [
      { id: 'freply-bike-1', by: 'staff-celine', text: 'Glad you like them! Ask the instructor to set you up before class. Seat height is roughly your hip bone while standing next to the bike.', day: -2, hm: '19:00', likes: 5 },
      { id: 'freply-bike-2', by: 'member-kim-rachel', text: 'Mark your settings on the little tag under the seat so you can set up fast next time.', day: -1, hm: '06:55', likes: 3 },
    ],
  },
  {
    id: 'topic-lost-found',
    title: 'Lost and found: black water bottle and a blue towel',
    content: 'I left a black insulated water bottle and a blue towel near the free weights Saturday morning. Has anyone seen them?',
    category: 'general',
    by: 'member-marchetti-sofia',
    day: -1,
    hm: '10:20',
    likes: 1,
    replies: [
      { id: 'freply-lf-1', by: 'staff-frontdesk', text: 'Hi Sofia, we have a black bottle at the front desk. Stop by any time and tell us the brand so we can match it.', day: -1, hm: '11:00', likes: 2 },
    ],
  },
  {
    id: 'topic-kids-swim',
    title: 'Saturday swim lessons: which stage after Pre Stage 1?',
    content: 'My daughter just finished Pre Stage 1. Does she move to Pre Stage 2 or can she skip ahead?',
    category: 'swim',
    by: 'member-nguyen-linh',
    day: -5,
    hm: '12:30',
    likes: 6,
    replies: [
      { id: 'freply-kswim-1', by: 'staff-elena', text: 'Hi Linh! Most kids move to Pre Stage 2. We reassess at the end of every session and will tell you if she is ready to skip ahead.', day: -5, hm: '14:10', likes: 4 },
      { id: 'freply-kswim-2', by: 'member-rivera-daniel', text: 'Same boat here. Emily moved our son up after one extra practice week.', day: -4, hm: '07:45', likes: 2 },
    ],
  },
  {
    id: 'topic-walking-club',
    title: 'Morning walking club on the Sligo Creek trail',
    content: 'A few of us walk the Sligo Creek trail on Thursdays at 8:00 AM and then grab coffee. All paces welcome. Reply to join the group chat.',
    category: 'community',
    by: 'member-sullivan-margaret',
    day: -7,
    hm: '15:10',
    likes: 17,
    replies: [
      { id: 'freply-walk-1', by: 'member-gallagher-tom', text: 'I am in. I will meet you at the Wayne Avenue entrance.', day: -7, hm: '16:30', likes: 2 },
      { id: 'freply-walk-2', by: 'member-mendez-gloria', text: 'This is just what I was looking for. New member here!', day: -6, hm: '09:00', likes: 3 },
      { id: 'freply-walk-3', by: 'staff-alex', text: 'Love this. Stretch your calves and hips afterward, and post any trail photos here.', day: -6, hm: '12:00', likes: 4 },
    ],
  },
  {
    id: 'topic-nutrition',
    title: 'Meal prep ideas for early morning workouts',
    content: 'I train at 6 AM and never know what to eat beforehand. What works for you, and is it okay to train fasted?',
    category: 'fitness',
    by: 'member-carter-devon',
    day: -9,
    hm: '20:00',
    likes: 10,
    replies: [
      { id: 'freply-meal-1', by: 'staff-alex', text: 'A banana and a spoonful of peanut butter 30 minutes before works for most people. Fasted is fine for easy cardio, but eat before heavy lifting.', day: -9, hm: '21:10', likes: 7 },
      { id: 'freply-meal-2', by: 'member-washington-isaiah', text: 'Overnight oats with berries. Make five jars on Sunday and you are set.', day: -8, hm: '06:40', likes: 3 },
    ],
  },
  {
    id: 'topic-parking',
    title: 'Parking tips for evening classes',
    content: 'The lot fills up around 5:30. Any tips for parking before the 6:00 PM classes?',
    category: 'facilities',
    by: 'member-robinson-tamika',
    day: -10,
    hm: '17:40',
    likes: 5,
    replies: [
      { id: 'freply-park-1', by: 'staff-desk', text: 'The Spring Street garage is a two minute walk and is free for the first hour with a validation from the front desk.', day: -10, hm: '18:30', likes: 6 },
    ],
  },
  {
    id: 'topic-swim-meet',
    title: 'Masters swim: anyone interested in a fall meet?',
    content: 'Thinking about entering a local masters meet in the fall. Is anyone from the Monday night masters group interested in signing up as a team?',
    category: 'swim',
    by: 'member-adeyemi-priscilla',
    day: -6,
    hm: '19:20',
    likes: 7,
    replies: [
      { id: 'freply-meet-1', by: 'staff-alek', text: 'I can help coordinate entries and a relay. Come by the pool deck Monday night and we will make a list.', day: -6, hm: '20:05', likes: 5 },
    ],
  },
  {
    id: 'topic-personal-training',
    title: 'Is personal training worth it for a beginner?',
    content: 'I joined last month and feel lost on the weight floor. @Doc, how does a first personal training session work and what should I bring?',
    category: 'fitness',
    by: 'member-sam',
    day: -8,
    hm: '12:15',
    likes: 11,
    mentionsStaff: ['staff-alex'],
    replies: [
      { id: 'freply-pt-1', by: 'staff-alex', text: 'Absolutely. The first session is a goals and movement check, then we build a simple 4 week plan around your schedule. Bring water, a towel, and any past injuries you want me to know about. You can request a session right from the Lessons tab.', day: -8, hm: '13:00', likes: 8 },
      { id: 'freply-pt-2', by: 'member-feldman-naomi', text: 'Did this in my first month and never felt lost on the floor again.', day: -7, hm: '07:20', likes: 3 },
    ],
  },
  {
    id: 'topic-childwatch-hours',
    title: 'Child Watch hours and what to bring',
    content: 'First time using Child Watch this weekend. What are the hours, how long can my kids stay, and do I need to pack anything?',
    category: 'facilities',
    by: 'member-rivera-daniel',
    day: -6,
    hm: '09:05',
    likes: 9,
    replies: [
      { id: 'freply-cw-1', by: 'staff-frontdesk', text: 'Hi Daniel! Child Watch is open Saturday 9 to 12 and weekday mornings. Kids can stay up to two hours while you are in the building. Please bring a labeled water bottle and list any allergies at drop-off. You will get a pickup code at check-in.', day: -6, hm: '09:50', likes: 6 },
      { id: 'freply-cw-2', by: 'member-robinson-tamika', text: 'My two love it. Staff are wonderful. Just keep your pickup code handy.', day: -5, hm: '08:35', likes: 3 },
    ],
  },
  {
    id: 'topic-membership-family',
    title: 'Adding a family member to our membership',
    content: 'We have an adult membership and want to add our teenager. Do we do that at the desk or online, and does the price change?',
    category: 'general',
    by: 'member-hassan-omar',
    day: -4,
    hm: '18:40',
    likes: 4,
    replies: [
      { id: 'freply-fam-1', by: 'staff-desk', text: 'Good question, Omar. Stop by the front desk or message us in the app and we will look at the right plan for your household. Our Membership team can also review Open Doors financial assistance if it helps.', day: -4, hm: '19:30', likes: 5 },
    ],
  },
  {
    id: 'topic-lap-swim',
    title: 'Quietest times for lap swim?',
    content: 'I swim laps before work and the lanes get crowded around 6:30. @Alek, when is the pool least busy?',
    category: 'swim',
    by: 'member-kowalski-walter',
    day: -5,
    hm: '16:00',
    likes: 6,
    mentionsStaff: ['staff-alek'],
    replies: [
      { id: 'freply-lap-1', by: 'staff-alek', text: 'Mid morning, 9:30 to 11:00, and again after 7:30 PM are the lightest. Circle swimming is in effect whenever more than two people share a lane.', day: -5, hm: '16:40', likes: 5 },
      { id: 'freply-lap-2', by: 'member-gallagher-tom', text: 'Confirming the late evening tip. Hardly anyone there after 8.', day: -4, hm: '07:15', likes: 2 },
    ],
  },
  {
    id: 'topic-teen-lessons',
    title: 'Swim lessons for a nervous 9 year old',
    content: 'My son is nervous about deep water. Is there a way to meet the instructor before signing up? Thanks, @Emily Wilson.',
    category: 'swim',
    by: 'member-patel-arjun',
    day: -3,
    hm: '19:10',
    likes: 5,
    mentionsStaff: ['staff-elena'],
    replies: [
      { id: 'freply-nerv-1', by: 'staff-elena', text: 'Of course, Arjun. Bring him by the pool deck any afternoon and we will do a free 10 minute water comfort check so he can meet the team. We keep ratios small and go at each swimmer\'s pace.', day: -3, hm: '20:00', likes: 6 },
    ],
  },
  {
    id: 'topic-new-year-goals',
    title: 'Accountability partners for the fall challenge',
    content: 'Looking for a workout buddy to keep me honest through the fall wellness challenge. Aiming for four visits a week. Anyone?',
    category: 'community',
    by: 'member-cho-aiden',
    day: -2,
    hm: '21:15',
    likes: 8,
    replies: [
      { id: 'freply-buddy-1', by: 'member-marchetti-sofia', text: 'I am in. I usually come Monday, Wednesday, Friday after class.', day: -2, hm: '21:40', likes: 2 },
      { id: 'freply-buddy-2', by: 'staff-celine', text: 'Love this. Check in at the front desk each visit and your streak will count toward the challenge. Reach out to me if you want help setting a plan.', day: -1, hm: '08:30', likes: 5 },
    ],
  },
  {
    id: 'topic-senior-fitness',
    title: 'Senior fitness: balance classes for beginners',
    content: 'My husband and I are in our 70s and want to start something gentle. Which classes do you recommend?',
    category: 'programs',
    by: 'member-kowalski-walter',
    day: -11,
    hm: '10:30',
    likes: 13,
    replies: [
      { id: 'freply-sen-1', by: 'staff-celine', text: 'Welcome! Start with Monday Senior Chair Fitness and Wednesday Aqua Arthritis. Both are low impact and drop in. I am happy to walk you through the studio first.', day: -11, hm: '11:15', likes: 7 },
      { id: 'freply-sen-2', by: 'member-briggs-harold', text: 'Joined both last year. Best decision for my balance.', day: -10, hm: '08:00', likes: 4 },
    ],
  },
];

function authorInfo(
  base: SeedState,
  id: string,
  extraMembers: Member[]
): { name: string; role: ForumTopic['authorRole'] } {
  const staff = base.staff.find((s) => s.id === id);
  if (staff) return { name: staff.name, role: staff.staffRole ?? 'staff' };
  const m = [...base.members, ...extraMembers].find((x) => x.id === id);
  return { name: m?.name ?? 'Member', role: 'member' };
}

function buildForum(base: SeedState, extraMembers: Member[]): { topics: ForumTopic[]; replies: ForumReply[] } {
  const topics: ForumTopic[] = [];
  const replies: ForumReply[] = [];
  for (const t of FORUM) {
    const a = authorInfo(base, t.by, extraMembers);
    const rs = t.replies.map<ForumReply>((r) => {
      const ra = authorInfo(base, r.by, extraMembers);
      return {
        id: r.id,
        topicId: t.id,
        content: r.text,
        authorId: r.by,
        authorName: ra.name,
        authorRole: ra.role,
        isStaffReply: r.by.startsWith('staff-'),
        likes: r.likes ?? 0,
        likedBy: [],
        createdAt: at(r.day, r.hm),
        ...(r.mentions ? { mentionedStaffIds: r.mentions } : {}),
      };
    });
    replies.push(...rs);
    const last = rs[rs.length - 1];
    const lastChattedAtBy: Record<string, string> = {};
    for (const r of rs) lastChattedAtBy[r.authorId] = r.createdAt;
    topics.push({
      id: t.id,
      title: t.title,
      content: t.content,
      category: t.category,
      authorId: t.by,
      authorName: a.name,
      authorRole: a.role,
      pinned: t.pinned ?? false,
      likes: t.likes ?? 0,
      likedBy: t.likedBy ?? [],
      interestedBy: [],
      participantIds: Array.from(new Set(rs.map((r) => r.authorId))),
      lastChattedAtBy,
      replyCount: rs.length,
      hasStaffReply: rs.some((r) => r.isStaffReply),
      createdAt: at(t.day, t.hm),
      updatedAt: last ? last.createdAt : at(t.day, t.hm),
      ...(t.mentionsStaff
        ? {
            mentionedStaffIds: t.mentionsStaff,
            mentionedStaffNames: t.mentionsStaff.map((id) => authorInfo(base, id, extraMembers).name),
          }
        : {}),
    });
  }
  return { topics, replies };
}

type CfSpec = [classId: string, by: string, text: string, day: number, hm: string, pinned?: boolean];
const CLASS_POSTS: CfSpec[] = [
  ['sched-cycle-tue', 'staff-celine', 'New bikes are in. Arrive 10 minutes early and the instructor will help with seat and handlebar settings.', -3, '09:00', true],
  ['sched-cycle-tue', 'member-vasquez-elena', 'Is the 6:00 AM class the same format as the evening one?', -2, '07:30'],
  ['sched-cycle-tue', 'staff-celine', 'Same format, but the morning ride is a little shorter on hills.', -2, '08:10'],
  ['sched-yoga-thu', 'staff-sarah', 'Please bring a mat and a towel. Props are in the cabinet next to the mirror.', -4, '13:00', true],
  ['sched-yoga-thu', 'member-sullivan-margaret', 'Are blocks and straps available for beginners?', -3, '08:20'],
  ['sched-yoga-thu', 'staff-sarah', 'Yes, plenty of both. Ask me at the start of class and I will set you up.', -3, '09:00'],
  ['sched-senior-chair-mon', 'staff-celine', 'We will practice seated balance this week. Wear closed-toe shoes.', -5, '15:00', true],
  ['sched-senior-chair-mon', 'member-briggs-harold', 'Is the class still at 10:30 on Monday?', -4, '17:25'],
  ['sched-senior-chair-mon', 'staff-celine', 'Yes, Harold. See you in the studio.', -4, '18:00'],
  ['sched-aqua-wed', 'staff-alek', 'Water temperature in the warm pool is 90 degrees this week. Bring a towel and water shoes if you like.', -2, '10:00', true],
  ['sched-aqua-wed', 'member-gallagher-tom', 'Do we need to register for this one?', -2, '11:40'],
  ['sched-aqua-wed', 'staff-alek', 'No registration. Drop in any Wednesday.', -2, '12:10'],
  ['sched-sat-zumba-1115', 'member-robinson-tamika', 'Anyone bringing kids? Wondering if Child Watch is open.', -1, '09:15'],
  ['sched-sat-zumba-1115', 'staff-frontdesk', 'Child Watch is open Saturday from 9 to 12, so yes!', -1, '10:00'],
  ['sched-sat-bodypump-0900', 'staff-alex', 'Light and medium plates are by the instructor platform. Beginners welcome.', -5, '18:00', true],
];

function buildClassPosts(base: SeedState, extraMembers: Member[]): ClassForumPost[] {
  return CLASS_POSTS.map(([classId, by, text, day, hm, pinned], i) => {
    const a = authorInfo(base, by, extraMembers);
    return {
      id: `cfp-x-${i + 1}`,
      classId,
      authorId: by,
      authorName: a.name,
      authorRole: a.role,
      content: text,
      createdAt: at(day, hm),
      pinned: pinned ?? false,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Donations, feedback, tickets
// ---------------------------------------------------------------------------------------------

type DonSpec = [memberId: string | undefined, name: string, email: string, cents: number, freq: 'one-time' | 'monthly', designation: string, brand: string, last4: string, day: number];
const DONATIONS: DonSpec[] = [
  ['member-patel-arjun', 'Arjun Patel', 'arjun.patel@example.com', 10000, 'one-time', 'Youth Swim Lessons', 'Visa', '9046', -9],
  ['member-kowalski-walter', 'Walter Kowalski', 'walter.kowalski@example.com', 2500, 'monthly', 'Healthy Living for Seniors', 'Discover', '6103', -21],
  ['member-rivera-carmen', 'Carmen Rivera', 'carmen.rivera@example.com', 5000, 'one-time', 'Open Doors Financial Assistance Fund', 'Visa', '5521', -34],
  ['member-kim-rachel', 'Rachel Kim', 'rachel.kim@example.com', 1500, 'monthly', 'Where it is needed most', 'Visa', '7119', -40],
  ['member-nguyen-linh', 'Linh Nguyen', 'linh.nguyen@example.com', 2000, 'one-time', 'Youth Swim Lessons', 'Mastercard', '3318', -52],
  [undefined, 'Hollis & Grant Family Foundation', 'giving@hollisgrant.example.org', 50000, 'one-time', 'Open Doors Financial Assistance Fund', 'Visa', '0042', -63],
  ['member-sullivan-margaret', 'Margaret Sullivan', 'margaret.sullivan@example.com', 3000, 'one-time', 'Healthy Living for Seniors', 'Visa', '0925', -71],
  ['member-feldman-naomi', 'Naomi Feldman', 'naomi.feldman@example.com', 2500, 'monthly', 'Where it is needed most', 'Visa', '9034', -85],
  ['member-jordan-spouse', 'Jane Doe', 'jane@silverspring.ymca', 7500, 'one-time', 'Youth Swim Lessons', 'Visa', '4242', -100],
];

function buildDonations(): Donation[] {
  return DONATIONS.map(([memberId, donorName, donorEmail, amountCents, frequency, designation, paymentBrand, paymentLast4, day], i) => ({
    id: `don-x-${i + 1}`,
    ...(memberId ? { memberId } : {}),
    donorName,
    donorEmail,
    amountCents,
    frequency,
    designation,
    paymentBrand,
    paymentLast4,
    createdAt: at(day, '13:15'),
    taxDeductibleId: '53-0196605',
    receiptNumber: `YMCA-2026-${88200 + i * 37}`,
    ...(i === 2 ? { dedication: { tributeType: 'honor' as const, name: 'Maria Rivera', message: 'For my mother, who taught every kid on our street to swim.' } } : {}),
  }));
}

type CsSpec = {
  id: string;
  type: ComplaintSuggestion['type'];
  category: ComplaintSuggestion['category'];
  title: string;
  details: string;
  by?: [id: string, name: string, email: string];
  anon?: boolean;
  status: ComplaintSuggestion['status'];
  reply?: [staffId: string, staffName: string, text: string];
  day: number;
  hm: string;
};

const FEEDBACK: CsSpec[] = [
  { id: 'cs-x-1', type: 'complaint', category: 'locker_rooms', title: 'Men\'s locker room shower drain is slow', details: 'The second shower from the door drains slowly and the floor stays wet through the morning. It has been like this for about a week.', by: ['member-ortega-luis', 'Luis Ortega', 'luis.ortega@example.com'], status: 'resolved', reply: ['staff-admin', 'David (Staff Admin)', 'Thanks Luis. Facilities cleared the drain on Thursday and we will check it daily.'], day: -8, hm: '07:50' },
  { id: 'cs-x-2', type: 'suggestion', category: 'group_classes', title: 'More evening yoga on weekdays', details: 'The 6:15 PM Vinyasa is always full. Could we add a second evening yoga class, maybe a gentler one around 7:30?', by: ['member-vasquez-elena', 'Elena Vasquez', 'elena.vasquez@example.com'], status: 'under_review', reply: ['staff-celine', 'Celine (Wellness Director)', 'We are talking with instructors about a 7:30 PM slot. I will share an update soon.'], day: -6, hm: '20:15' },
  { id: 'cs-x-3', type: 'complaint', category: 'pool_aquatics', title: 'Lap lanes crowded on Saturday mornings', details: 'Around 9 AM on Saturdays there are four or more swimmers per lane, which makes lap swimming difficult.', by: ['member-adeyemi-priscilla', 'Priscilla Adeyemi', 'priscilla.adeyemi@example.com'], status: 'under_review', reply: ['staff-alek', 'Alek (Aquatics Director)', 'Thanks for flagging it. We are looking at splitting speeds by lane during the busiest hour.'], day: -5, hm: '10:30' },
  { id: 'cs-x-4', type: 'suggestion', category: 'facility_cleanliness', title: 'Add more sanitizing wipe stations', details: 'It would help to have wipe stations near the cable machines and the dumbbell area, not only by the entrance.', status: 'resolved', anon: true, reply: ['staff-admin', 'David (Staff Admin)', 'Done. We added three stations near the cable machines and the dumbbell racks.'], day: -14, hm: '17:40' },
  { id: 'cs-x-5', type: 'complaint', category: 'staff_service', title: 'Wait time at the front desk after 5 PM', details: 'The line at the desk is long around 5:30 PM when classes let out. Is there a faster way to check in?', by: ['member-robinson-tamika', 'Tamika Robinson', 'tamika.robinson@example.com'], status: 'submitted', day: -2, hm: '18:10' },
  { id: 'cs-x-6', type: 'suggestion', category: 'programs_events', title: 'Family movie night in the gym', details: 'A monthly family movie night with popcorn would be a great way to meet other families and keep the kids busy on Fridays.', by: ['member-rivera-daniel', 'Daniel Rivera', 'daniel.rivera@example.com'], status: 'under_review', reply: ['staff-desk', 'Billy Deveaux (Membership Director)', 'Love this idea. We will try one during the Parents Night Out event and see how it goes.'], day: -9, hm: '19:00' },
  { id: 'cs-x-7', type: 'complaint', category: 'equipment', title: 'Treadmill 4 belt is slipping', details: 'The belt on the fourth treadmill from the window slips at speeds over 6 mph. I stopped using it after a couple of minutes.', by: ['member-gallagher-tom', 'Tom Gallagher', 'tom.gallagher@example.com'], status: 'resolved', reply: ['staff-celine', 'Celine (Wellness Director)', 'Thank you Tom. A technician replaced the belt and tension on Tuesday.'], day: -11, hm: '10:10' },
  { id: 'cs-x-8', type: 'suggestion', category: 'hours_schedules', title: 'Open the pool 30 minutes earlier on weekends', details: 'A lot of us swim before work on weekdays but on Saturdays the pool opens at 7:00. Opening at 6:30 would be great.', by: ['member-feldman-naomi', 'Naomi Feldman', 'naomi.feldman@example.com'], status: 'submitted', day: -1, hm: '08:45' },
  { id: 'cs-x-9', type: 'complaint', category: 'facility_cleanliness', title: 'Studio B floor was sticky', details: 'After the Zumba class the floor in Studio B was sticky near the mirrors. Maybe the floor could be mopped between classes.', status: 'submitted', anon: true, day: -3, hm: '19:55' },
];

function buildFeedback(): ComplaintSuggestion[] {
  return FEEDBACK.map((f) => ({
    id: f.id,
    type: f.type,
    title: f.title,
    details: f.details,
    category: f.category,
    branchId: BRANCH,
    ...(f.by ? { memberId: f.by[0], memberName: f.by[1], memberEmail: f.by[2] } : {}),
    isAnonymous: Boolean(f.anon),
    status: f.status,
    ...(f.reply ? { staffResponse: f.reply[2], respondedByStaffId: f.reply[0], respondedByStaffName: f.reply[1] } : {}),
    createdAt: at(f.day, f.hm),
    updatedAt: at(f.day + (f.reply ? 1 : 0), '09:20'),
  }));
}

function buildMaintenanceTickets(): ComplaintSuggestion[] {
  const base = { type: 'complaint' as const, branchId: BRANCH, department: 'maintenance' as const };
  return [
    {
      ...base,
      id: 'cs-maint-1',
      title: 'Water on the pool deck near lane 6',
      details: 'There is a steady drip from the ceiling above the lap lanes and the deck is getting slippery.',
      category: 'maint_safety',
      location: 'Indoor lap pool deck',
      urgency: 'urgent',
      memberId: 'member-riley',
      memberName: 'Riley Chen',
      memberEmail: 'riley.chen@example.com',
      isAnonymous: false,
      status: 'submitted',
      createdAt: at(-1, '07:10'),
    },
    {
      ...base,
      id: 'cs-maint-2',
      title: 'Treadmill 4 belt keeps slipping',
      details: 'The belt jerks every few seconds at speeds above 5 mph.',
      category: 'maint_gym_equipment',
      location: 'Wellness floor, cardio row',
      urgency: 'normal',
      memberId: 'member-nora',
      memberName: 'Nora Whitfield',
      memberEmail: 'nora.whitfield@example.com',
      isAnonymous: false,
      status: 'under_review',
      staffResponse: 'Thanks Nora, treadmill 4 is tagged out of service and a technician is scheduled.',
      respondedByStaffId: 'staff-maint',
      respondedByStaffName: 'Zino',
      createdAt: at(-3, '18:40'),
      updatedAt: at(-2, '09:00'),
    },
    {
      ...base,
      id: 'cs-maint-3',
      type: 'suggestion',
      title: 'Add a second hot water heater for the family locker room',
      details: 'Showers run cold after the morning rush. A larger tank or second heater would help.',
      category: 'maint_plumbing',
      location: 'Family locker room',
      urgency: 'low',
      submittedByStaffId: 'staff-sarah',
      submittedByStaffName: 'Jane Doe',
      isAnonymous: false,
      status: 'submitted',
      createdAt: at(-2, '14:05'),
    },
    {
      ...base,
      id: 'cs-maint-4',
      title: 'Pool lane line reel is jammed',
      details: 'The lane 3 reel will not retract, so we cannot clear the lane for lessons.',
      category: 'maint_pool_equipment',
      location: 'Indoor lap pool, lane 3',
      urgency: 'normal',
      submittedByStaffId: 'staff-elena',
      submittedByStaffName: 'Emily Wilson',
      isAnonymous: false,
      status: 'resolved',
      staffResponse: 'Reel freed and lubricated. Please flag it again if it sticks.',
      respondedByStaffId: 'staff-maint',
      respondedByStaffName: 'Zino',
      createdAt: at(-6, '06:50'),
      updatedAt: at(-5, '10:15'),
    },
  ];
}

type TkSpec = Pick<SupportTicket, 'type' | 'title' | 'description' | 'category' | 'priority' | 'status'> & {
  userId: string;
  name: string;
  email: string;
  day: number;
  device: string;
  thread: Line[];
};

const TICKETS: TkSpec[] = [
  { userId: 'member-riley', name: 'Riley Chen', email: 'riley.chen@example.com', type: 'problem_report', title: 'Barcode is too dim to scan at the turnstile', description: 'The check-in barcode is hard for the scanner to read when my phone is on low brightness.', category: 'app_bug', priority: 'high', status: 'resolved', day: -10, device: 'iOS 18 · Text Scale: Standard', thread: [['m', 'The check-in barcode is hard for the scanner to read when my phone is on low brightness.', -10, '07:30'], ['s', 'Thanks Riley. The pass screen now raises brightness automatically while it is open. Update to the latest build and let me know.', -9, '10:00'], ['m', 'Works great now!', -9, '18:20']] },
  { userId: 'member-nora', name: 'Nora Whitfield', email: 'nora.whitfield@example.com', type: 'feature_request', title: 'Larger text option on the class schedule', description: 'The class names on the schedule are small. Is there a way to make them larger?', category: 'feature_idea', priority: 'normal', status: 'in_progress', day: -5, device: 'Android 15 · Text Scale: Larger', thread: [['m', 'The class names on the schedule are small. Is there a way to make them larger?', -5, '10:15'], ['s', 'You can change it under Account, then Accessibility, and pick Larger or Largest. I will also look at making the schedule rows roomier.', -5, '13:00']] },
  { userId: 'member-patel-arjun', name: 'Arjun Patel', email: 'arjun.patel@example.com', type: 'problem_report', title: 'Cannot add my son\'s swim class to the calendar', description: 'The Add to Calendar button on the swim class does nothing on my phone.', category: 'schedule_booking', priority: 'normal', status: 'open', day: -2, device: 'iOS 18 · Text Scale: Standard', thread: [['m', 'The Add to Calendar button on the swim class does nothing on my phone.', -2, '21:10']] },
  { userId: 'member-feldman-naomi', name: 'Naomi Feldman', email: 'naomi.feldman@example.com', type: 'problem_report', title: 'Locked out after changing my email', description: 'I changed my email on my account and now cannot sign in with either address.', category: 'account_access', priority: 'urgent', status: 'in_progress', day: -1, device: 'iOS 17 · Text Scale: Standard', thread: [['m', 'I changed my email on my account and now cannot sign in with either address.', -1, '08:05'], ['s', 'Sorry about that, Naomi. I am resetting your login now. You should get a link in a few minutes.', -1, '08:40']] },
  { userId: 'member-kim-rachel', name: 'Rachel Kim', email: 'rachel.kim@example.com', type: 'feature_request', title: 'Show class capacity on the schedule', description: 'It would be helpful to see how many spots are left before opening the class details.', category: 'feature_idea', priority: 'low', status: 'open', day: -7, device: 'Android 14 · Text Scale: Standard', thread: [['m', 'It would be helpful to see how many spots are left before opening the class details.', -7, '19:30']] },
];

function buildTickets(): { tickets: SupportTicket[]; threads: Thread[]; messages: Message[] } {
  const tickets: SupportTicket[] = [];
  const threads: Thread[] = [];
  const messages: Message[] = [];
  TICKETS.forEach((t, i) => {
    const threadId = `thread-ticket-${t.userId.replace('member-', '')}`;
    tickets.push({
      id: `ticket-x-${i + 1}`,
      ticketNumber: `YMCA-IT-${1002 + i}`,
      userId: t.userId,
      userName: t.name,
      userEmail: t.email,
      userRole: 'member',
      type: t.type,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      threadId,
      deviceInfo: t.device,
      createdAt: at(t.day, '09:00'),
      updatedAt: at(t.day + 1, '09:30'),
    });
    threads.push({ id: threadId, memberId: t.userId, staffId: 'staff-itadmin' });
    t.thread.forEach(([who, body, day, hm], j) => {
      messages.push({
        id: `msg-x-ticket-${i + 1}-${j + 1}`,
        threadId,
        fromId: who === 'm' ? t.userId : 'staff-itadmin',
        body,
        createdAt: at(day, hm),
      });
    });
  });
  return { tickets, threads, messages };
}

// ---------------------------------------------------------------------------------------------
// Desk: leads, contacts, campaigns
// ---------------------------------------------------------------------------------------------

type LeadSpec = Omit<Lead, 'createdAt' | 'updatedAt' | 'nextFollowUpDate'> & { created: number; updated: number; follow?: number };

const LEADS: LeadSpec[] = [
  { id: 'lead-x-1', name: 'Rosa Delgado', phone: '(301) 555-0517', email: 'rosa.delgado@example.com', source: 'walk_in', status: 'tour_scheduled', interestPlanId: 'family-2', assignedStaffId: 'staff-frontdesk', campaignId: 'camp-fall-2026', notes: 'Toured with her husband and two kids. Wants Child Watch details and swim lessons.', created: -4, updated: -2, follow: 1 },
  { id: 'lead-x-2', name: 'Kwame Asante', phone: '(301) 555-0524', email: 'kwame.asante@example.com', source: 'web', status: 'new', interestPlanId: 'adult', assignedStaffId: 'staff-frontdesk', campaignId: 'camp-fall-2026', notes: 'Submitted the online form. Wants a lap pool and weights membership.', created: -1, updated: -1, follow: 0 },
  { id: 'lead-x-3', name: 'Beth Lindqvist', phone: '(301) 555-0539', email: 'beth.lindqvist@example.com', source: 'referral', status: 'contacted', interestPlanId: 'senior-adult', assignedStaffId: 'staff-frontdesk', notes: 'Referred by Margaret Sullivan. Interested in the water classes.', created: -7, updated: -3, follow: 2 },
  { id: 'lead-x-4', name: 'Miguel Santos', phone: '(301) 555-0541', email: 'miguel.santos@example.com', source: 'guest_pass', status: 'follow_up', interestPlanId: 'young-adult', assignedStaffId: 'staff-frontdesk', campaignId: 'camp-fall-2026', notes: 'Used a guest pass last week. Said he would decide after payday.', created: -9, updated: -4, follow: 0 },
  { id: 'lead-x-5', name: 'Tanya Brooks-Hill', phone: '(301) 555-0552', email: 'tanya.bh@example.com', source: 'phone', status: 'contacted', interestPlanId: 'family-1', assignedStaffId: 'staff-desk', notes: 'Called about swim lessons for her 6 year old. Wants a Family I quote.', created: -6, updated: -5, follow: -1 },
  { id: 'lead-x-6', name: 'Jonah Weiss', phone: '(301) 555-0560', email: 'jonah.weiss@example.com', source: 'lapsed_member', status: 'follow_up', interestPlanId: 'adult', assignedStaffId: 'staff-frontdesk', campaignId: 'camp-fall-2026', notes: 'Cancelled in the spring after moving. Has moved back to Silver Spring.', created: -12, updated: -6, follow: 1 },
  { id: 'lead-x-7', name: 'Olivia Grant', phone: '(301) 555-0573', email: 'olivia.grant@example.com', source: 'walk_in', status: 'won', interestPlanId: 'adult', assignedStaffId: 'staff-frontdesk', campaignId: 'camp-fall-2026', notes: 'Joined at the desk after her tour. Fee waived under the fall offer.', created: -16, updated: -14 },
  { id: 'lead-x-8', name: 'Samuel Adeleke', phone: '(301) 555-0588', email: 'samuel.adeleke@example.com', source: 'web', status: 'tour_scheduled', interestPlanId: 'senior-family', assignedStaffId: 'staff-frontdesk', notes: 'Coming in with his wife for a tour on Thursday.', created: -3, updated: -1, follow: 3 },
  { id: 'lead-x-9', name: 'Priyanka Rao', phone: '(301) 555-0596', email: 'priyanka.rao@example.com', source: 'referral', status: 'new', interestPlanId: 'young-adult', assignedStaffId: 'staff-frontdesk', notes: 'Friend of Sofia Marchetti. Interested in group classes.', created: -1, updated: -1, follow: 2 },
  { id: 'lead-x-10', name: 'Dale Hutchins', phone: '(301) 555-0602', email: 'dale.hutchins@example.com', source: 'phone', status: 'lost', interestPlanId: 'adult', assignedStaffId: 'staff-frontdesk', notes: 'Went with a gym closer to his work.', created: -20, updated: -15 },
];

function buildLeads(): Lead[] {
  return LEADS.map(({ created, updated, follow, ...rest }) => ({
    ...rest,
    ...(follow !== undefined ? { nextFollowUpDate: on(follow) } : {}),
    createdAt: at(created, '11:20'),
    updatedAt: at(updated, '14:05'),
  }));
}

type ContactSpec = Omit<MemberContact, 'createdAt' | 'followUpDate'> & { day: number; follow?: number };
const CONTACT_ROWS: ContactSpec[] = [
  { id: 'contact-x-1', memberId: 'member-sam', staffId: 'staff-frontdesk', staffName: 'Liz', channel: 'in_person', purpose: 'billing', outcome: 'card_updated', notes: 'Sam stopped by and added a new Mastercard. Payment cleared.', day: -11 },
  { id: 'contact-x-2', memberId: 'member-adeyemi-priscilla', staffId: 'staff-frontdesk', staffName: 'Liz', channel: 'call', purpose: 'billing', outcome: 'voicemail', notes: 'Left a voicemail about the expired card. Will call again tomorrow.', day: -6, follow: 1 },
  { id: 'contact-x-3', memberId: 'member-carter-devon', staffId: 'staff-frontdesk', staffName: 'Liz', channel: 'sms', purpose: 'billing', outcome: 'callback', notes: 'Texted a reminder to update the card in the app. Devon said he would do it tonight.', day: -3, follow: 0 },
  { id: 'contact-x-4', memberId: 'member-ortega-luis', staffId: 'staff-desk', staffName: 'Billy Deveaux', channel: 'call', purpose: 'billing', outcome: 'no_answer', notes: 'Called twice, no answer. Sent an email with a payment link.', day: -2, follow: 1 },
  { id: 'contact-x-5', memberId: 'member-mendez-gloria', staffId: 'staff-frontdesk', staffName: 'Liz', channel: 'call', purpose: 'welcome', outcome: 'resolved', notes: 'Welcome call. Gloria is enjoying the water classes and asked about the walking club.', day: -9 },
  { id: 'contact-x-6', memberId: 'member-bell-tasha', staffId: 'staff-frontdesk', staffName: 'Liz', channel: 'call', purpose: 'welcome', outcome: 'resolved', notes: 'New member check-in call. Scheduled a free gym orientation for Thursday.', day: -12 },
  { id: 'contact-x-7', memberId: 'member-washington-isaiah', staffId: 'staff-desk', staffName: 'Billy Deveaux', channel: 'call', purpose: 'retention', outcome: 'callback', notes: 'Isaiah is relocating for work. Offered a pause instead of cancelling; he will think it over.', day: -4, follow: 2 },
  { id: 'contact-x-8', leadId: 'lead-x-5', staffId: 'staff-desk', staffName: 'Billy Deveaux', channel: 'call', purpose: 'sales', outcome: 'callback', notes: 'Walked through Family I pricing. Tanya will talk with her partner.', day: -5, follow: -1 },
  { id: 'contact-x-9', leadId: 'lead-x-7', staffId: 'staff-frontdesk', staffName: 'Liz', channel: 'in_person', purpose: 'sales', outcome: 'sold', notes: 'Joined after her tour. Booked a free orientation with Doc.', day: -14 },
];

function buildContacts(): MemberContact[] {
  return CONTACT_ROWS.map(({ day, follow, ...rest }) => ({
    ...rest,
    ...(follow !== undefined ? { followUpDate: on(follow) } : {}),
    createdAt: at(day, '13:40'),
  }));
}

const CAMPAIGNS: EnrollmentCampaign[] = [
  {
    id: 'camp-summer-2026',
    name: 'Summer Family Swim: Half-Price Joining Fee',
    description: 'Family memberships joined this summer received 50 percent off the one-time joining fee.',
    startDate: on(-105),
    endDate: on(-14),
    waiveEnrollmentFee: false,
    enrollmentFeeDiscountPct: 50,
    eligiblePlanIds: ['family-1', 'family-2'],
    active: false,
    createdByStaffId: 'staff-desk',
  },
  {
    id: 'camp-winter-2026',
    name: 'Winter Wellness: $25 Joining Fee',
    description: 'Start the new year with a reduced joining fee on Adult, Young Adult and Senior memberships.',
    startDate: on(70),
    endDate: on(112),
    waiveEnrollmentFee: false,
    enrollmentFeeDiscountPct: 75,
    eligiblePlanIds: ['adult', 'young-adult', 'senior-adult'],
    active: true,
    createdByStaffId: 'staff-desk',
  },
];

// ---------------------------------------------------------------------------------------------
// Training: sessions, logs, goals
// ---------------------------------------------------------------------------------------------

type Ex = [name: string, sets: number, reps: string, weight?: string];
type LogSpec = {
  id: string;
  member: string;
  day: number;
  type: ClientWorkoutLog['sessionType'];
  title: string;
  notes: string;
  rpe: number;
  feedback?: string;
  ex: Ex[];
  by?: 'trainer' | 'member';
};

const LOGS: LogSpec[] = [
  { id: 'log-x-1', member: 'member-jordan', day: -5, type: '1-on-1', title: 'Upper Body Push and Pull', notes: 'Focused on shoulder blade position on rows. Left shoulder is moving better overhead.', rpe: 7, feedback: 'Shoulder felt good all session.', ex: [['Dumbbell Bench Press', 4, '8-10', '55 lbs ea'], ['Chest-Supported Row', 3, '10-12', '50 lbs ea'], ['Half-Kneeling Landmine Press', 3, '8/side', '35 lbs'], ['Face Pulls', 3, '15', 'Cable']] },
  { id: 'log-x-2', member: 'member-jordan', day: -2, type: 'self-directed', title: 'Lap Swim and Core', notes: '30 minute continuous swim, then core circuit.', rpe: 6, by: 'member', ex: [['Freestyle Laps', 1, '30 min'], ['Dead Bug', 3, '10/side', 'Bodyweight'], ['Plank', 3, '45s', 'Bodyweight']] },
  { id: 'log-x-3', member: 'member-riley', day: -7, type: 'assessment', title: 'Intro Session and Running Assessment', notes: 'Strong cardio base. Weak single leg stability and hip control. Plan: two strength days per week alongside running.', rpe: 6, feedback: 'Did not realize how wobbly my left side is.', ex: [['Single-Leg Balance', 3, '30s/side', 'Bodyweight'], ['Goblet Squat', 3, '10', '25 lbs'], ['Glute Bridge', 3, '12', 'Bodyweight'], ['Lateral Band Walk', 3, '12/side', 'Light band']] },
  { id: 'log-x-4', member: 'member-nora', day: -9, type: '1-on-1', title: 'Chair-Supported Balance Work', notes: 'Introduced sit-to-stand and heel raises. Good control, no dizziness.', rpe: 3, feedback: 'Felt steadier than I expected.', ex: [['Sit-to-Stand', 3, '8', 'Chair'], ['Heel Raises', 3, '12', 'Counter support'], ['Tandem Stance', 3, '20s', 'Counter support'], ['Seated Marching', 2, '20', 'Bodyweight']] },
  { id: 'log-x-5', member: 'member-nora', day: -2, type: 'mobility', title: 'Mobility and Light Strength', notes: 'Added light bands for shoulder mobility. She can now stand from the chair without using her hands.', rpe: 4, ex: [['Band Pull-Aparts', 3, '12', 'Light band'], ['Wall Slides', 3, '10', 'Bodyweight'], ['Step-Ups (4 in)', 3, '8/side', 'Rail support']] },
  { id: 'log-x-6', member: 'member-feldman-naomi', day: -6, type: 'assessment', title: 'Back and Hip Mobility Assessment', notes: 'Tight hip flexors and limited thoracic rotation from desk work. Prescribed daily 10 minute mobility routine.', rpe: 5, ex: [['90/90 Hip Flow', 3, '8/side'], ['Thread the Needle', 3, '8/side'], ['Bird Dog', 3, '10/side'], ['Pallof Press', 3, '12/side', 'Cable']] },
  { id: 'log-x-7', member: 'member-feldman-naomi', day: -1, type: 'strength', title: 'Anti-Rotation Core and Hinge', notes: 'Hinge pattern is improving. Cue: ribs down and brace before lifting.', rpe: 7, feedback: 'Back felt much better afterward.', ex: [['Romanian Deadlift', 3, '10', '65 lbs'], ['Pallof Press', 3, '12/side', 'Cable'], ['Suitcase Carry', 3, '30 m', '35 lbs']] },
  { id: 'log-x-8', member: 'member-carter-devon', day: -8, type: 'hiit', title: 'Full Body HIIT Circuit', notes: 'Strong conditioning. Needs a reminder to pace the first round.', rpe: 9, ex: [['Kettlebell Swing', 4, '15', '35 lbs'], ['Box Jump', 4, '8', '20 in'], ['Battle Rope Waves', 4, '30s'], ['Burpees', 4, '10', 'Bodyweight']] },
  { id: 'log-x-9', member: 'member-carter-devon', day: -3, type: 'strength', title: 'Squat and Press Day', notes: 'Added 10 lbs to the squat. Good bar path.', rpe: 8, ex: [['Back Squat', 5, '5', '185 lbs'], ['Overhead Press', 4, '6', '95 lbs'], ['Pull-Ups (assisted)', 3, '8', '30 lb assist']] },
  { id: 'log-x-10', member: 'member-kim-rachel', day: -12, type: 'cardio', title: 'Zone 2 Cardio Build', notes: '40 minutes on the bike at a conversational pace. Heart rate stayed in zone.', rpe: 5, ex: [['Stationary Bike', 1, '40 min'], ['Incline Walk', 1, '10 min', '6% grade']] },
  { id: 'log-x-11', member: 'member-kim-rachel', day: -4, type: 'strength', title: 'Lower Body Strength', notes: 'Added tempo work on split squats. Knee tracking is good.', rpe: 7, ex: [['Front Squat', 4, '6', '95 lbs'], ['Walking Lunges', 3, '10/leg', '20 lbs ea'], ['Leg Curl', 3, '12', '60 lbs']] },
  { id: 'log-x-12', member: 'member-gallagher-tom', day: -10, type: 'recovery', title: 'Post-Knee Recovery Session', notes: 'Cleared by his physical therapist for light loading. Kept range pain-free.', rpe: 3, ex: [['Leg Press', 3, '12', '70 lbs'], ['Terminal Knee Extension', 3, '15', 'Band'], ['Stationary Bike', 1, '10 min']] },
  { id: 'log-x-13', member: 'member-riley', day: -3, type: 'strength', title: 'Single-Leg Strength for Runners', notes: 'Stability much improved from the first session. Added a step-down progression.', rpe: 7, feedback: 'Felt great on yesterday\'s run.', ex: [['Bulgarian Split Squat', 3, '8/leg', '20 lbs ea'], ['Step-Downs', 3, '10/leg', 'Bodyweight'], ['Calf Raise', 3, '15', '45 lbs']] },
  { id: 'log-x-14', member: 'member-jordan', day: -12, type: 'mobility', title: 'Hip and Shoulder Mobility', notes: 'Added band distraction for the left shoulder and hip airplanes.', rpe: 4, ex: [['Hip Airplanes', 3, '6/side'], ['Band Shoulder Distraction', 3, '45s/side'], ['Cat-Camel', 2, '10']] },
];

function buildLogs(): ClientWorkoutLog[] {
  return LOGS.map((l) => ({
    id: l.id,
    memberId: l.member,
    trainerId: 'staff-alex',
    trainerName: 'Doc',
    date: on(l.day),
    sessionType: l.type,
    title: l.title,
    notes: l.notes,
    exercises: l.ex.map<WorkoutExercise>(([name, sets, reps, weight]) => ({ name, sets, reps, ...(weight ? { weight } : {}) })),
    rpe: l.rpe,
    loggedBy: l.by ?? 'trainer',
    ...(l.feedback ? { clientFeedback: l.feedback } : {}),
    createdAt: at(l.day, '11:30'),
  }));
}

const GOALS: Record<string, ClientFitnessGoal> = {
  'member-riley': {
    memberId: 'member-riley',
    primaryGoal: 'Run the Silver Spring 10K without knee pain',
    category: 'endurance',
    targetDate: on(75),
    injuriesOrLimitations: 'History of mild IT band irritation on the left side',
    notes: 'Two strength days per week alongside running. Progress single-leg work and add hill repeats once step-downs are clean.',
    updatedBy: 'trainer',
    updatedByName: 'Doc',
    updatedAt: at(-7, '15:00'),
  },
  'member-nora': {
    memberId: 'member-nora',
    primaryGoal: 'Improve balance and leg strength to stay active and independent',
    category: 'mobility',
    targetDate: on(110),
    injuriesOrLimitations: 'Mild osteoarthritis in both knees; avoid deep lunges',
    specificWarnings: [{ id: 'warn-x-1', text: 'Check blood pressure before sessions if she feels lightheaded', severity: 'moderate', createdBy: 'trainer', authorName: 'Doc' }],
    notes: 'Low impact, chair support first. Progress to standing balance without support.',
    memberNotes: 'I want to walk the Sligo Creek trail without getting tired halfway.',
    updatedBy: 'trainer',
    updatedByName: 'Doc',
    updatedAt: at(-9, '12:00'),
  },
  'member-feldman-naomi': {
    memberId: 'member-feldman-naomi',
    primaryGoal: 'Reduce lower back stiffness and build core strength',
    category: 'wellness',
    targetDate: on(60),
    injuriesOrLimitations: 'Recurring lower back tightness from long desk hours',
    notes: 'Daily 10 minute hip and thoracic mobility. Brace before every hinge.',
    updatedBy: 'trainer',
    updatedByName: 'Doc',
    updatedAt: at(-6, '12:20'),
  },
  'member-carter-devon': {
    memberId: 'member-carter-devon',
    primaryGoal: 'Add 30 lbs to the back squat and run a sub-25 minute 5K',
    category: 'strength',
    targetDate: on(95),
    startWeightLbs: 192,
    currentWeightLbs: 188,
    targetWeightLbs: 182,
    notes: 'Linear progression on squat, two conditioning days per week.',
    updatedBy: 'trainer',
    updatedByName: 'Doc',
    updatedAt: at(-3, '12:00'),
  },
  'member-kim-rachel': {
    memberId: 'member-kim-rachel',
    primaryGoal: 'Lose 12 lbs and build a consistent three-day routine',
    category: 'weight_loss',
    targetDate: on(120),
    startWeightLbs: 158,
    currentWeightLbs: 153,
    targetWeightLbs: 146,
    notes: 'Zone 2 cardio twice a week plus a full body strength day.',
    updatedBy: 'trainer',
    updatedByName: 'Doc',
    updatedAt: at(-4, '12:00'),
  },
};

type PastLesson = {
  id: string;
  member: string;
  staff: string;
  day: number;
  hm: string;
  type: 'training' | 'swim';
  min: 30 | 60;
  status: PrivateLesson['status'];
  swimmer?: string;
  participant?: string;
};

const PAST_LESSONS: PastLesson[] = [
  { id: 'lesson-x-1', member: 'member-jordan', staff: 'staff-alex', day: -3, hm: '10:00', type: 'training', min: 60, status: 'completed' },
  { id: 'lesson-x-2', member: 'member-jordan', staff: 'staff-alex', day: -10, hm: '10:00', type: 'training', min: 60, status: 'completed' },
  { id: 'lesson-x-3', member: 'member-riley', staff: 'staff-alex', day: -7, hm: '14:00', type: 'training', min: 60, status: 'completed' },
  { id: 'lesson-x-4', member: 'member-nora', staff: 'staff-alex', day: -9, hm: '16:00', type: 'training', min: 30, status: 'completed' },
  { id: 'lesson-x-5', member: 'member-feldman-naomi', staff: 'staff-alex', day: -6, hm: '09:00', type: 'training', min: 60, status: 'completed' },
  { id: 'lesson-x-6', member: 'member-carter-devon', staff: 'staff-alex', day: -8, hm: '17:30', type: 'training', min: 60, status: 'completed' },
  { id: 'lesson-x-7', member: 'member-kim-rachel', staff: 'staff-alex', day: -4, hm: '17:30', type: 'training', min: 30, status: 'no_show' },
  { id: 'lesson-x-8', member: 'member-nguyen-linh', staff: 'staff-elena', day: -5, hm: '16:30', type: 'swim', min: 30, status: 'completed', swimmer: 'Kevin Nguyen', participant: 'child-nguyen-kevin' },
  { id: 'lesson-x-9', member: 'member-rivera-daniel', staff: 'staff-sarah', day: -12, hm: '18:00', type: 'swim', min: 60, status: 'cancelled', swimmer: 'Mateo Rivera', participant: 'child-rivera-mateo' },
  { id: 'lesson-x-10', member: 'member-adeyemi-priscilla', staff: 'staff-alek', day: -12, hm: '07:00', type: 'swim', min: 30, status: 'completed' },
];

const PRICE = { training: { 30: 3500, 60: 6000 }, swim: { 30: 3000, 60: 5500 } } as const;

function buildPastLessons(): PrivateLesson[] {
  return PAST_LESSONS.map((l) => {
    const endMin = Number(l.hm.slice(0, 2)) * 60 + Number(l.hm.slice(3)) + l.min;
    const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    return {
      id: l.id,
      memberId: l.member,
      staffId: l.staff,
      slotId: `past-${l.id}`,
      start: at(l.day, l.hm),
      end: at(l.day, end),
      location: l.type === 'swim' ? 'Indoor Lap Pool' : 'Wellness Floor',
      status: l.status,
      lessonType: l.type,
      durationMin: l.min,
      paidAmountCents: l.status === 'cancelled' ? 0 : PRICE[l.type][l.min],
      paymentTiming: 'before',
      paymentStatus: l.status === 'cancelled' ? 'due' : 'paid',
      ...(l.status === 'completed' ? { completedAt: at(l.day, end) } : {}),
      ...(l.swimmer ? { swimmerName: l.swimmer } : {}),
      ...(l.participant ? { participantMemberId: l.participant } : {}),
    } satisfies PrivateLesson;
  });
}

function sreq(
  r: Pick<SessionRequest, 'id' | 'memberId' | 'memberName' | 'staffId' | 'staffName' | 'lessonType' | 'durationMin' | 'location' | 'status'> & {
    startDay: number;
    startHm: string;
    createdDay: number;
    swimmer?: string;
    participant?: string;
    notes?: string;
    lessonId?: string;
    events: SessionRequest['history'];
  }
): SessionRequest {
  const endMin = Number(r.startHm.slice(0, 2)) * 60 + Number(r.startHm.slice(3)) + r.durationMin;
  const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  return {
    id: r.id,
    memberId: r.memberId,
    memberName: r.memberName,
    staffId: r.staffId,
    staffName: r.staffName,
    lessonType: r.lessonType,
    durationMin: r.durationMin,
    start: at(r.startDay, r.startHm),
    end: at(r.startDay, end),
    location: r.location,
    paymentTiming: 'after',
    status: r.status,
    createdAt: at(r.createdDay, '12:00'),
    history: r.events,
    ...(r.swimmer ? { swimmerName: r.swimmer } : {}),
    ...(r.participant ? { participantMemberId: r.participant } : {}),
    ...(r.notes ? { notes: r.notes } : {}),
    ...(r.lessonId ? { lessonId: r.lessonId } : {}),
  };
}

function buildSessionRequests(): { requests: SessionRequest[]; lessons: PrivateLesson[] } {
  const requests: SessionRequest[] = [
    sreq({ id: 'sreq-x-naomi', memberId: 'member-feldman-naomi', memberName: 'Naomi', staffId: 'staff-alex', staffName: 'Doc', lessonType: 'training', durationMin: 60, location: 'Wellness Floor', status: 'pending', startDay: 5, startHm: '09:00', createdDay: -1, events: [{ at: at(-1, '12:40'), byId: 'member-feldman-naomi', byName: 'Naomi', byRole: 'member', action: 'requested' }] }),
    sreq({ id: 'sreq-x-tom', memberId: 'member-gallagher-tom', memberName: 'Tom', staffId: 'staff-alex', staffName: 'Doc', lessonType: 'training', durationMin: 30, location: 'Wellness Floor', status: 'pending', startDay: 1, startHm: '11:00', createdDay: -1, events: [{ at: at(-1, '14:05'), byId: 'member-gallagher-tom', byName: 'Tom', byRole: 'member', action: 'requested' }] }),
    sreq({ id: 'sreq-x-priscilla', memberId: 'member-adeyemi-priscilla', memberName: 'Priscilla', staffId: 'staff-alek', staffName: 'Alek', lessonType: 'swim', durationMin: 30, location: 'Indoor Lap Pool (Lane 2)', status: 'pending', startDay: 1, startHm: '07:00', createdDay: -5, swimmer: 'Priscilla Adeyemi', events: [{ at: at(-5, '12:10'), byId: 'member-adeyemi-priscilla', byName: 'Priscilla', byRole: 'member', action: 'requested' }] }),
    sreq({ id: 'sreq-x-aiden', memberId: 'member-cho-aiden', memberName: 'Aiden', staffId: 'staff-alex', staffName: 'Doc', lessonType: 'training', durationMin: 60, location: 'Wellness Floor', status: 'declined', startDay: 4, startHm: '10:00', createdDay: -3, events: [{ at: at(-3, '09:00'), byId: 'member-cho-aiden', byName: 'Aiden', byRole: 'member', action: 'requested' }, { at: at(-3, '11:15'), byId: 'staff-alex', byName: 'Doc', byRole: 'trainer', action: 'declined', note: 'I am out of the building Friday morning. Try Thursday at 9:00?' }] }),
    sreq({ id: 'sreq-x-kevin', memberId: 'member-nguyen-linh', memberName: 'Linh', staffId: 'staff-elena', staffName: 'Emily Wilson', lessonType: 'swim', durationMin: 30, location: 'Indoor Pool', status: 'countered', startDay: 2, startHm: '16:30', createdDay: -2, swimmer: 'Kevin Nguyen', participant: 'child-nguyen-kevin', events: [{ at: at(-2, '09:30'), byId: 'member-nguyen-linh', byName: 'Linh', byRole: 'member', action: 'requested', start: at(2, '16:30'), end: at(2, '17:00') }, { at: at(-2, '13:00'), byId: 'staff-elena', byName: 'Emily Wilson', byRole: 'swim_instructor', action: 'countered', start: at(2, '17:00'), end: at(2, '17:30'), note: 'I have a class until 4:45. Would 5:00 work?' }] }),
    sreq({ id: 'sreq-x-rachel', memberId: 'member-kim-rachel', memberName: 'Rachel', staffId: 'staff-alex', staffName: 'Doc', lessonType: 'training', durationMin: 30, location: 'Wellness Floor', status: 'accepted', startDay: 3, startHm: '17:30', createdDay: -4, lessonId: 'lesson-req-sreq-x-rachel', events: [{ at: at(-4, '19:00'), byId: 'member-kim-rachel', byName: 'Rachel', byRole: 'member', action: 'requested' }, { at: at(-4, '20:10'), byId: 'staff-alex', byName: 'Doc', byRole: 'trainer', action: 'accepted' }] }),
    sreq({ id: 'sreq-x-daniel', memberId: 'member-rivera-daniel', memberName: 'Daniel', staffId: 'staff-sarah', staffName: 'Jane Doe', lessonType: 'swim', durationMin: 60, location: 'Indoor Pool', status: 'cancelled', startDay: 3, startHm: '18:00', createdDay: -10, swimmer: 'Mateo Rivera', participant: 'child-rivera-mateo', events: [{ at: at(-10, '18:30'), byId: 'member-rivera-daniel', byName: 'Daniel', byRole: 'member', action: 'requested' }, { at: at(-8, '08:00'), byId: 'member-rivera-daniel', byName: 'Daniel', byRole: 'member', action: 'cancelled', note: 'Schedule conflict' }] }),
  ];
  const lessons: PrivateLesson[] = [
    {
      id: 'lesson-req-sreq-x-rachel',
      memberId: 'member-kim-rachel',
      staffId: 'staff-alex',
      slotId: 'req-sreq-x-rachel',
      start: at(3, '17:30'),
      end: at(3, '18:00'),
      location: 'Wellness Floor',
      status: 'booked',
      lessonType: 'training',
      durationMin: 30,
      paidAmountCents: 0,
      paymentTiming: 'after',
      paymentStatus: 'due',
      requestId: 'sreq-x-rachel',
    },
    {
      id: 'lesson-x-devon-next',
      memberId: 'member-carter-devon',
      staffId: 'staff-alex',
      slotId: 'slot-alex-tue-1400',
      start: at(1, '14:00'),
      end: at(1, '15:00'),
      location: 'Wellness Floor',
      status: 'booked',
      lessonType: 'training',
      durationMin: 60,
      paidAmountCents: 6000,
      paymentLast4: '4417',
      paymentTiming: 'before',
      paymentStatus: 'paid',
    },
  ];
  return { requests, lessons };
}

// ---------------------------------------------------------------------------------------------
// Swim enrollments, registrations, saved classes, events
// ---------------------------------------------------------------------------------------------

type EnrollSpec = [id: string, memberId: string, classId: string, participantName: string, participantId: string | undefined, last4: string, tier: 'full' | 'program', day: number];
const ENROLLMENTS: EnrollSpec[] = [
  ['enr-x-1', 'member-jordan', 'class-sat-02', 'Mia Doe', 'child-jordan-1', '4242', 'full', -6],
  ['enr-x-2', 'member-jordan', 'class-sat-01', 'Leo Doe', 'child-jordan-2', '4242', 'full', -6],
  ['enr-x-3', 'member-nguyen-linh', 'class-sat-04', 'Kevin Nguyen', 'child-nguyen-kevin', '3318', 'full', -4],
  ['enr-x-4', 'member-nguyen-linh', 'class-sat-13', 'Amy Nguyen', 'child-nguyen-amy', '3318', 'full', -4],
  ['enr-x-5', 'member-patel-arjun', 'class-sat-07', 'Anika Patel', 'child-patel-anika', '9046', 'full', -9],
  ['enr-x-6', 'member-patel-arjun', 'class-sun-05', 'Rohan Patel', 'child-patel-rohan', '9046', 'full', -9],
  ['enr-x-7', 'member-rivera-daniel', 'class-sun-03', 'Mateo Rivera', 'child-rivera-mateo', '5521', 'full', -11],
  ['enr-x-8', 'member-rivera-daniel', 'class-sat-06', 'Lucia Rivera', 'child-rivera-lucia', '5521', 'full', -11],
  ['enr-x-9', 'member-robinson-tamika', 'class-sun-07', 'Zoe Robinson', 'child-robinson-zoe', '2750', 'full', -8],
  ['enr-x-10', 'member-hassan-omar', 'class-sun-09', 'Yasmin Hassan', 'child-hassan-yasmin', '8812', 'program', -7],
  ['enr-x-11', 'member-cho-aiden', 'class-sun-01', 'Aiden Cho', undefined, '3374', 'full', -10],
  ['enr-x-12', 'member-feldman-naomi', 'class-mon-masters', 'Naomi Feldman', undefined, '9034', 'program', -13],
];

const PROGRAM_PRICE = { full: 11200, program: 18500, mastersFull: 17000, mastersProgram: 24500 };

function buildEnrollments(): SwimClassEnrollment[] {
  return ENROLLMENTS.map(([id, memberId, classId, participantName, participantId, last4, tier, day]) => {
    const masters = classId === 'class-mon-masters';
    const cents = masters
      ? tier === 'full'
        ? PROGRAM_PRICE.mastersFull
        : PROGRAM_PRICE.mastersProgram
      : tier === 'full'
        ? PROGRAM_PRICE.full
        : PROGRAM_PRICE.program;
    return {
      id,
      memberId,
      classId,
      participantName,
      paidAmountCents: cents,
      paymentLast4: last4,
      pricingTier: tier,
      status: 'enrolled' as const,
      enrolledAt: at(day, '19:10'),
      ...(participantId ? { participantMemberId: participantId } : {}),
    };
  });
}

/** Upcoming week for the senior demo member (Nora; the Jordan household stays clean for tests) so the Home "This Week" section has real content. */
const DEMO_REGISTRATION_PLAN: { scheduleItemId: string; paid?: number }[] = [
  { scheduleItemId: 'sched-swim-lesson-tue', paid: 2500 },
  { scheduleItemId: 'sched-wed-fullcircle-1800' },
  { scheduleItemId: 'sched-swim-clinic-wed', paid: 3000 },
  { scheduleItemId: 'sched-fri-fullcircle-0730' },
];

const DEMO_REGISTRATIONS: ClassRegistration[] = DEMO_REGISTRATION_PLAN.map(({ scheduleItemId, paid }, i) => ({
  id: `reg-demo-${i}`,
  memberId: 'member-nora',
  scheduleItemId,
  status: 'registered',
  registeredAt: at(-1, '09:00'),
  attendanceStatus: 'unmarked',
  ...(paid ? { paidAmountCents: paid, paymentLast4: '4242' } : {}),
}));

const DEMO_LESSONS: PrivateLesson[] = [
  {
    id: 'lesson-demo-orientation',
    memberId: 'member-nora',
    staffId: 'staff-alex',
    slotId: 'demo-slot-orientation',
    start: at(2, '12:00'),
    end: at(2, '12:30'),
    location: 'Wellness Floor',
    status: 'booked',
    lessonType: 'training',
    durationMin: 30,
    paidAmountCents: 0,
    paymentTiming: 'before',
    paymentStatus: 'paid',
    isOrientation: true,
    notes: 'Tour of the fitness center, equipment walkthrough and a starter plan.',
  },
  {
    id: 'lesson-demo-training',
    memberId: 'member-nora',
    staffId: 'staff-alex',
    slotId: 'demo-slot-training',
    start: at(3, '17:30'),
    end: at(3, '18:30'),
    location: 'Wellness Floor',
    status: 'booked',
    lessonType: 'training',
    durationMin: 60,
    paidAmountCents: 6000,
    paymentLast4: '4242',
    paymentTiming: 'before',
    paymentStatus: 'paid',
    notes: 'Lower body strength focus. Bring a water bottle and a towel.',
  },
  {
    id: 'lesson-demo-training-2',
    memberId: 'member-nora',
    staffId: 'staff-alex',
    slotId: 'demo-slot-training-2',
    start: at(5, '10:00'),
    end: at(5, '10:30'),
    location: 'Wellness Floor',
    status: 'booked',
    lessonType: 'training',
    durationMin: 30,
    paidAmountCents: 0,
    paymentTiming: 'after',
    paymentStatus: 'due',
  },
];

const SAVED: SavedClass[] = [
  { memberId: 'member-jordan', scheduleItemId: 'sched-bodypump-mon' },
  { memberId: 'member-jordan', scheduleItemId: 'sched-yoga-thu' },
  { memberId: 'member-jordan', scheduleItemId: 'sched-sat-bodypump-0900' },
  { memberId: 'member-jordan-spouse', scheduleItemId: 'sched-tue-vinyasa-0700' },
  { memberId: 'member-jordan-spouse', scheduleItemId: 'sched-sat-zumba-1115' },
  { memberId: 'member-riley', scheduleItemId: 'sched-cycle-tue' },
  { memberId: 'member-nora', scheduleItemId: 'sched-senior-chair-mon' },
  { memberId: 'member-nora', scheduleItemId: 'sched-aqua-wed' },
  { memberId: 'member-vasquez-elena', scheduleItemId: 'sched-cycle-tue' },
  { memberId: 'member-sullivan-margaret', scheduleItemId: 'sched-yoga-thu' },
];

const EVENTS: ScheduleItem[] = [
  {
    id: 'sched-event-kids-expo',
    branchId: BRANCH,
    category: 'event',
    title: 'Healthy Kids Day Expo',
    start: at(5, '10:00'),
    end: at(5, '13:00'),
    location: 'Gym & Outdoor Pool Deck',
    instructorName: 'YMCA Events Committee',
    capacity: 200,
    priceCents: 0,
    isSpecialEvent: true,
    registrationRequired: false,
    description: 'A free community morning with games, health screenings, a splash zone and healthy snacks. Open to families from the neighborhood.',
  },
  {
    id: 'sched-event-parents-night',
    branchId: BRANCH,
    category: 'event',
    title: 'Parents Night Out',
    start: at(4, '18:00'),
    end: at(4, '21:00'),
    location: 'Gym & Studio B',
    instructorName: 'Youth Program Staff',
    capacity: 24,
    priceCents: 2500,
    isSpecialEvent: true,
    registrationRequired: true,
    description: 'Drop the kids off for three hours of games, a movie and pizza while you enjoy an evening out. Ages 4 to 11. Advance registration is required.',
  },
  {
    id: 'sched-event-blood-drive',
    branchId: BRANCH,
    category: 'event',
    title: 'Community Blood Drive',
    start: at(2, '11:00'),
    end: at(2, '16:00'),
    location: 'Studio A',
    instructorName: 'American Red Cross',
    capacity: 40,
    priceCents: 0,
    isSpecialEvent: true,
    registrationRequired: true,
    description: 'Give blood with the American Red Cross. Please bring a photo ID, eat a good meal beforehand and drink plenty of water. Appointments are required.',
  },
  {
    id: 'sched-event-halloween-swim',
    branchId: BRANCH,
    category: 'event',
    title: 'Halloween Family Swim Night',
    start: at(18, '18:00'),
    end: at(18, '20:00'),
    location: 'Indoor Pool',
    instructorName: 'Aquatics Team',
    capacity: 80,
    priceCents: 500,
    isSpecialEvent: true,
    registrationRequired: true,
    description: 'Costumes are welcome in the shallow end. Pumpkin floats, glow sticks and a small prize for every swimmer. Children must be accompanied by an adult.',
  },
  {
    id: 'sched-event-wellness-fair',
    branchId: BRANCH,
    category: 'event',
    title: 'Active Older Adults Wellness Fair',
    start: at(8, '10:00'),
    end: at(8, '12:30'),
    location: 'Studio A',
    instructorName: 'Celine and Wellness Team',
    capacity: 60,
    priceCents: 0,
    isSpecialEvent: true,
    registrationRequired: false,
    seniorFriendly: true,
    description: 'Blood pressure checks, balance screenings, chair yoga demos and conversations with our wellness team. Light refreshments provided.',
  },
];

/** Spreads sign-ups across every class that needs advance registration, filling some to capacity. */
function buildRegistrations(schedules: ScheduleItem[], memberIds: string[]): ClassRegistration[] {
  const regs: ClassRegistration[] = [];
  const registrable = schedules.filter((s) => s.registrationRequired || s.isSpecialEvent || s.category === 'event');
  const fill = [0.7, 0.55, 0.8, 0.35, 0.75, 0.65, 0.5, 0.6, 0.7];
  registrable.forEach((s, idx) => {
    const want = Math.max(1, Math.min(memberIds.length, Math.round(Math.min(s.capacity, 30) * fill[idx % fill.length])));
    for (let k = 0; k < want; k++) {
      const memberId = memberIds[(idx * 7 + k) % memberIds.length];
      if (regs.some((r) => r.memberId === memberId && r.scheduleItemId === s.id)) continue;
      regs.push({
        id: `reg-x-${s.id}-${k}`,
        memberId,
        scheduleItemId: s.id,
        status: 'registered',
        registeredAt: at(-2 - ((idx + k) % 9), '12:00'),
        attendanceStatus: 'unmarked',
        ...((s.priceCents ?? 0) > 0 ? { paidAmountCents: s.priceCents, paymentLast4: '4242' } : {}),
      });
    }
  });
  for (const forced of [
    ['member-nora', 'sched-event-wellness-fair'],
  ]) {
    if (!regs.some((r) => r.memberId === forced[0] && r.scheduleItemId === forced[1])) {
      regs.push({
        id: `reg-x-forced-${forced[0]}-${forced[1]}`,
        memberId: forced[0],
        scheduleItemId: forced[1],
        status: 'registered',
        registeredAt: at(-1, '09:30'),
        attendanceStatus: 'unmarked',
      });
    }
  }
  return regs;
}

// ---------------------------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------------------------

export function withExtras(base: SeedState): SeedState {
  const people = buildPeople();
  const convo = buildThreadsAndMessages();
  const tickets = buildTickets();
  const sessions = buildSessionRequests();
  const forum = buildForum(base, people.members);

  const eventItems = EVENTS.map((e) => ({ ...e, shortSummary: e.description }));
  const schedules = [...base.schedules, ...eventItems];

  // Demo personas keep a clean slate for live walkthroughs; everyone else fills the rosters.
  const PERSONAS = new Set(['member-jordan', 'member-jordan-spouse', 'member-jordan-teen', 'member-riley', 'member-sam', 'member-nora']);
  const adultIds = [...base.members, ...people.members]
    .filter((m) => m.householdRole !== 'dependent' && !m.id.startsWith('guest-') && m.status === 'active' && !PERSONAS.has(m.id))
    .map((m) => m.id);

  const assignments: TrainerAssignment[] = [
    ...base.assignments,
    ...['member-riley', 'member-nora', 'member-feldman-naomi', 'member-carter-devon', 'member-kim-rachel', 'member-gallagher-tom'].map(
      (memberId) => ({ memberId, staffId: 'staff-alex' })
    ),
  ];

  // The lead used by the first contact record keeps its original follow-up.
  return {
    ...base,
    members: [...base.members, ...people.members],
    memberships: [...base.memberships, ...people.memberships],
    schedules,
    savedClasses: [...base.savedClasses, ...SAVED],
    classRegistrations: [...base.classRegistrations, ...buildRegistrations(schedules, adultIds), ...DEMO_REGISTRATIONS],
    sessionRequests: [...base.sessionRequests, ...sessions.requests],
    privateLessons: [...base.privateLessons, ...buildPastLessons(), ...sessions.lessons, ...DEMO_LESSONS],
    assignments,
    threads: [...base.threads.filter((t) => !convo.threads.some((c) => c.id === t.id)), ...convo.threads, ...tickets.threads],
    messages: [...base.messages, ...convo.messages, ...tickets.messages],
    announcements: [...base.announcements, ...ANNOUNCEMENTS],
    notifications: [...base.notifications, ...buildNotifications()],
    donations: [...base.donations, ...buildDonations()],
    classForumPosts: [...base.classForumPosts, ...buildClassPosts(base, people.members)],
    forumTopics: forum.topics,
    forumReplies: forum.replies,
    supportTickets: [...base.supportTickets, ...tickets.tickets],
    complaintsSuggestions: [...base.complaintsSuggestions, ...buildFeedback(), ...buildMaintenanceTickets()],
    workoutLogs: [...base.workoutLogs, ...buildLogs()],
    clientGoals: { ...base.clientGoals, ...GOALS },
    swimEnrollments: [...base.swimEnrollments, ...buildEnrollments()],
    memberContacts: [...base.memberContacts, ...buildContacts()],
    leads: [...base.leads, ...buildLeads()],
    enrollmentCampaigns: [...base.enrollmentCampaigns, ...CAMPAIGNS],
  };
}
