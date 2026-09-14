# YMCA Silver Spring App (prototype)

Demo logins (password for both: `ymca-demo`):
- Member: jordan@silverspring.ymca
- Staff: alex@silverspring.ymca

Prototype — not an official published YMCA app.

The demo **UI clock is frozen at 2026-09-14** (seeded next billing date remains 2026-10-12). Use **Reset demo data** on About to restore seed between pitch run-throughs.

## 5-minute pitch checklist

On one device, in under five minutes:

1. Log in as member Jordan Hale and see **next billing date Oct 12**, Adult membership, $80.00, Visa ••4242.
2. Browse Group Exercise / Swim / Child Watch / Events and save at least one class; saved classes appear on Home.
3. Submit a cancel notice and see a non-instant effective date that matches the one-month rule.
4. Update payment and see a new last4 with no full card number stored.
5. Send a message to trainer Alex Rivera.
6. Log out, log in as Alex, see today’s assignments, Jordan in Members, the cancel request, and the message, then reply.

## Run
npm install
npm start

## Tests
npm test
