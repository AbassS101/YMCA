export function formatShortDate(isoDate: string): string {
  if (isoDate === '') {
    return 'none remaining';
  }
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function cancelRequestedCopy(lastBillDate: string, accessThrough: string): string {
  const lastBill =
    lastBillDate === '' ? 'none remaining' : formatShortDate(lastBillDate);
  return `Cancellation requested — last bill ${lastBill}, access through ${formatShortDate(accessThrough)}.`;
}
