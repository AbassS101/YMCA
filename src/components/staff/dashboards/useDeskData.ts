import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { MemberRow } from '@/components/desk/SignInConsole';
import { useSession } from '@/context/SessionContext';
import { getDemoToday } from '@/domain/demoClock';
import type { BillingIssueRow, EnrollmentCampaign, Lead, Staff } from '@/domain/types';
import { arrivalRepo } from '@/repositories/arrivalRepo';
import { deskRepo, OPEN_LEAD_STATUSES, type FollowUp, type RepKpis } from '@/repositories/deskRepo';

import { BRANCH_ID } from './format';

export type DeskData = {
  profile: Staff | null;
  rows: MemberRow[];
  checkedInToday: Set<string>;
  billing: BillingIssueRow[];
  followUps: FollowUp[];
  openLeads: Lead[];
  campaign: EnrollmentCampaign | null;
  todayKpis: RepKpis | null;
  monthKpis: RepKpis | null;
  error: boolean;
  reload: () => Promise<void>;
};

export function useDeskData(staffId: string, canBilling: boolean, canLeads: boolean): DeskData {
  const { api } = useSession();
  const [profile, setProfile] = useState<Staff | null>(null);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [checkedInToday, setCheckedInToday] = useState<Set<string>>(new Set());
  const [billing, setBilling] = useState<BillingIssueRow[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [openLeads, setOpenLeads] = useState<Lead[]>([]);
  const [campaign, setCampaign] = useState<EnrollmentCampaign | null>(null);
  const [todayKpis, setTodayKpis] = useState<RepKpis | null>(null);
  const [monthKpis, setMonthKpis] = useState<RepKpis | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    if (staffId === '') return;
    try {
      setError(false);
      const today = getDemoToday();
      const [me, members, issues, leads, active, followUpList, arrived, kToday, kMonth] = await Promise.all([
        api.getStaff(staffId).catch(() => null),
        api.listAllMembers(BRANCH_ID),
        canBilling ? api.listBillingIssues(BRANCH_ID, staffId) : Promise.resolve([] as BillingIssueRow[]),
        canLeads ? api.listLeads(staffId) : Promise.resolve([] as Lead[]),
        deskRepo.activeCampaign(api),
        deskRepo.followUpsDue(api, today),
        arrivalRepo.arrivedMemberIds(api, BRANCH_ID, today),
        deskRepo.kpis(api, BRANCH_ID, staffId, 'today'),
        deskRepo.kpis(api, BRANCH_ID, staffId, 'month'),
      ]);
      const withPlans = await Promise.all(
        members.map(async (member) => ({ member, membership: await api.getMembership(member.id).catch(() => null) }))
      );
      setProfile(me);
      setRows(withPlans);
      setBilling(issues);
      setOpenLeads(
        leads
          .filter((l) => OPEN_LEAD_STATUSES.includes(l.status))
          .sort((a, b) => (a.nextFollowUpDate ?? '9999').localeCompare(b.nextFollowUpDate ?? '9999'))
      );
      setCampaign(active);
      setFollowUps(followUpList);
      setCheckedInToday(arrived);
      setTodayKpis(kToday);
      setMonthKpis(kMonth);
    } catch {
      setError(true);
    }
  }, [api, staffId, canBilling, canLeads]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { profile, rows, checkedInToday, billing, followUps, openLeads, campaign, todayKpis, monthKpis, error, reload };
}
