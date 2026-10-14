import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { HoursWindow } from '@/domain/childWatch';
import { formatCents } from '@/domain/lessonPricing';
import { canEditConfigSection, hasCapability, type ConfigSection, type StaffCapability } from '@/domain/staffCapabilities';

export type AdminTileGroup = 'Pricing & Deals' | 'Operations' | 'System' | 'Records';

export type AdminTile = {
  key: string;
  group: AdminTileGroup;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: string;
  /** The tile shows for anyone who can edit this section... */
  section?: ConfigSection;
  /** ...or who holds this capability. */
  capability?: StaffCapability;
};

export const ADMIN_TILES: readonly AdminTile[] = [
  { key: 'plans', group: 'Pricing & Deals', title: 'Membership Plans & Fees', subtitle: 'Monthly prices, enrollment fees, and which plans are offered', icon: 'card', route: '/(staff)/admin-plans', section: 'membershipPlans' },
  { key: 'lessons', group: 'Pricing & Deals', title: 'Lesson & Swim Pricing', subtitle: 'Private lesson and swim class prices', icon: 'pricetags', route: '/(staff)/lesson-pricing', section: 'lessonPricing' },
  { key: 'campaigns', group: 'Pricing & Deals', title: 'Deals & Promotions', subtitle: 'Enrollment campaigns and fee waivers', icon: 'gift', route: '/(staff)/campaigns', section: 'campaigns' },
  { key: 'wellness', group: 'Pricing & Deals', title: 'Wellness Packages', subtitle: 'Personal and partner training rates', icon: 'fitness', route: '/(staff)/admin-wellness-packages', section: 'wellnessPackages' },
  { key: 'guest', group: 'Pricing & Deals', title: 'Guest & Day Passes + Donations', subtitle: 'Pass allowances and prices, donation tiers and funds', icon: 'ticket', route: '/(staff)/admin-guest-donations', section: 'guestPasses' },
  { key: 'childWatch', group: 'Operations', title: 'Child Watch Rules', subtitle: 'Hours, sign-in cutoff, daily limit, age, and capacity', icon: 'happy', route: '/(staff)/admin-child-watch', section: 'childWatch' },
  { key: 'swimClasses', group: 'Operations', title: 'Swim Class Capacity', subtitle: 'How many swimmers each class takes, and which classes are hidden', icon: 'water', route: '/(staff)/admin-swim-classes', section: 'swimClasses' },
  { key: 'templates', group: 'Operations', title: 'Message Templates', subtitle: 'Guest pass share message and welcome call script', icon: 'chatbox-ellipses', route: '/(staff)/admin-templates', section: 'templates' },
  { key: 'toggles', group: 'System', title: 'Feature Toggles', subtitle: 'Turn app features on or off', icon: 'toggle', route: '/(staff)/admin-toggles', section: 'featureToggles' },
  { key: 'branding', group: 'System', title: 'Branding & Contact', subtitle: 'Branch name, address, phone, and hours', icon: 'business', route: '/(staff)/admin-branding', section: 'branding' },
  { key: 'thresholds', group: 'System', title: 'Alert Thresholds', subtitle: 'When cancellations, full classes, and new members are flagged', icon: 'speedometer', route: '/(staff)/admin-thresholds', section: 'thresholds' },
  { key: 'audit', group: 'Records', title: 'Change Log', subtitle: 'Who changed which setting, and when', icon: 'list', route: '/(staff)/admin-audit', capability: 'viewConfigAudit' },
];

/** The Admin Control Center tiles this role may open. */
export function adminCenterTiles(role: string | null | undefined): AdminTile[] {
  return ADMIN_TILES.filter(
    (t) => (t.section != null && canEditConfigSection(role, t.section)) || (t.capability != null && hasCapability(role, t.capability))
  );
}

export function canOpenAdminCenter(role: string | null | undefined): boolean {
  return adminCenterTiles(role).length > 0;
}

/** "12.50" -> 1250. Returns null for blank, negative, or non-numeric text. */
export function centsFromDollars(text: string): number | null {
  const t = text.trim().replace(/^\$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

export function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

/** Whole number, or undefined when blank; NaN when the text is not a whole number. */
export function optionalWholeNumber(text: string): number | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

/** A readable, unused id for a new plan or fund, e.g. "Summer Pass" -> "summer-pass". */
export function newSlugId(name: string, existingIds: string[]): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  let id = base;
  for (let n = 2; existingIds.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/** Plan subtitles quote the enrollment fee; keep that text in step when the fee changes. */
export function planSubtitleForFee(subtitle: string, feeCents: number): string {
  return subtitle.replace(/(Free|\$[\d.,]+) enrollment fee/, `${formatCents(feeCents)} enrollment fee`);
}

/** "09:00-12:00, 16:00-20:00" -> windows. Blank or "closed" means no windows; null when the text is malformed. */
export function parseHoursText(text: string): HoursWindow[] | null {
  const t = text.trim();
  if (t === '' || /^closed$/i.test(t)) return [];
  const windows: HoursWindow[] = [];
  for (const part of t.split(',')) {
    const m = /^\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\s*$/.exec(part);
    if (!m) return null;
    windows.push({ open: m[1], close: m[2] });
  }
  return windows;
}

export function formatHoursText(windows: HoursWindow[]): string {
  return windows.map((w) => `${w.open}-${w.close}`).join(', ');
}
