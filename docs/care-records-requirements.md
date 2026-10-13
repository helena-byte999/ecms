# Care records, family access and team accounts: requirements

**Status:** in build (October 2026). **Owner:** Ena Otuokon (product). These are post-2022 additions to ECMS, beyond the original team project.

## Problem

ECMS covers the business side of a care home (people, contracts, rotas, invoices) but not the care itself. Today:

- Caregivers have nowhere to record what they did for a resident: medicines given, meals, personal care, how the resident was, incidents.
- The next shift can't see what the last one did, so handovers rely on memory.
- Families can't see how their relative is doing without phoning the home.
- After a doctor's visit, medicine changes are written down somewhere else and the resident's profile goes out of date.
- Families share the resident's login, so several relatives can't have their own access and there's no record of who looked.
- New admins can only be created by a developer.

Care homes in England must keep "accurate, complete and contemporaneous" records of each person's care (CQC, Regulation 17), so recording care is the core job of a care system, not an extra.

## Benchmark

[Connecteam's home-care app](https://lp2.connecteam.com/homecare-app-new) is a workforce tool. What it offers, and what we take from it:

| Connecteam | Relevant to ECMS? | Decision |
|---|---|---|
| Care documentation with time and author stamps, "audit-ready" | Yes | **Now:** every care entry records who, when and what; entries can't be edited or deleted, only corrected |
| Reports exported for payroll and audits | Yes | **Now:** care summaries and a home overview, as PDF and CSV |
| Shift updates with read confirmations | Yes, as shift handover | Next |
| Time clock and timesheets | Partly (single site, so no GPS) | Next: clock in and out against the rota |
| Tasks and checklists | Yes | Next: daily care checklists and one-off tasks |
| Training and compliance documents | Yes | Later: staff training records with expiry alerts |
| Photos and signatures on records | Useful | Later: needs file storage (adds cost) |
| GPS or NFC clock-in, payroll integrations, AI | No | Won't do |

Connecteam doesn't cover medicines, care notes, doctor's visits or family access. Those come from care-specific record systems and from our own users' needs.

## Users and permissions

| | Admin | Caregiver | Family member | Resident (client) |
|---|---|---|---|---|
| Read a resident's care log and medicines | All residents | All residents | Their resident only | Their own |
| Add care entries, record doses | Yes | Yes | No | No |
| Add or stop medicines, record a doctor's visit | Yes | Yes | No | No |
| Care reports | All residents and the home overview | No | Their resident's summary | Their own summary |
| Contract and invoices | All | Their own | Their resident's (read only) | Their own |
| Create accounts | Admins, caregivers, residents, family | No | No | No |

- Any caregiver can read and write for any resident. There is no assignment of caregivers to residents yet, and the next shift needs to see what happened.
- Admins can add other admins. An admin can't deactivate themselves, and the last active admin can't be deactivated.
- Each family member has their own read-only login, linked to one resident. A resident can have several family members.

## Scope of this release

### 1. Care log
- Entry types: **meal and drink**, **personal care**, **wellbeing** (mood, temperature, unwell), **activity**, **incident** (fall, injury, skin, behaviour; severity; action taken; family informed), **note**.
- Each entry stores the resident, the author (name and role), when it happened (not in the future) and when it was written.
- Entries are append-only. A mistake is fixed by adding a correction that points to the original; both stay visible, and the original is marked "corrected".
- The log shows newest first and can be filtered by date range and type.

### 2. Medicines and doses
- Each resident has a medicine list: name, dose, times of day (or "as needed"), instructions, reason, start date and an optional end date for courses.
- Medicines are stopped, never deleted. A stop records who, when and why.
- **Today's round** (caregivers and admins): every scheduled dose for today across the home, grouped by time, showing *due*, *late* (more than an hour past and not recorded), *given*, *refused* or *missed*.
- Recording a dose takes one tap (given, refused or missed, plus an optional note). A dose can only be recorded once; changes are made with a correction.
- "As needed" medicines are recorded as one-off doses with a reason.

### 3. Doctor's visits
- Record the professional (e.g. "Dr Patel, GP"), reason, outcome and follow-up.
- In the same form: medicines to start, medicines to stop, and changes to allergies and conditions.
- Saving applies the changes to the resident's medicine list and medical profile **automatically** and keeps the visit, with each change (before and after), in the care log.
- This is a record made in ECMS. It does not connect to GP or NHS systems (see "Won't do").

### 4. Reports
- **Resident care summary** for a date range: doses scheduled, given, refused, missed and not recorded, per medicine; incidents; doctor's visits; medicine changes; days unwell and highest temperature; meals; entries by type.
- **Home overview** (admins): one row per resident (dose completion, refused and missed doses, incidents, visits), totals, and entries per caregiver.
- Download as **PDF** (for families and inspections) and **CSV** (for spreadsheets).
- Doses not recorded more than an hour after their time count as "not recorded", separately from "missed".

### 5. Accounts
- **Team page:** admins list, add and deactivate admins (with the safeguards above).
- **Family:** on a resident's record, admins add, list and deactivate family members. Family members sign in to a read-only view of that resident: overview, care log, medicines, contract and invoices.
- **Validation:** an account's role must be admin, caregiver, client or family. A family account must be linked to an existing resident.

### Demo data
Sample medicines for every resident, a week of care entries written by the caregivers on that day's rota, a few refused and missed doses, a minor fall, and a GP visit for Margaret Okafor that started a course of antibiotics. A new one-click "Family member" demo sign-in (Margaret's son). All of it is fictional and resets every night.

## Next

1. **Shift handover:** notes for the next shift, with read confirmations.
2. **Clock in and out** against the rota, with timesheets for admins.
3. **Tasks and checklists:** daily care checklists per resident and one-off tasks (e.g. "book an optician").
4. Staff training records with expiry alerts.
5. Photos and signatures on entries.

## Won't do

- **Automatic updates from GP or NHS systems.** This would need NHS approval to connect (for example GP Connect), the Data Security and Protection Toolkit, and clinical safety standards DCB0129 and DCB0160. That's not realistic for this project, and claiming it would mislead.
- GPS or NFC clock-in (a single-site home doesn't need it), payroll integrations, AI features.

## Privacy

Care records are health data: special category data under UK GDPR. The demo uses fictional people only. A real deployment would need a data protection impact assessment, a lawful basis and condition for processing, a retention policy, and an access log for family viewing. Making entries append-only and stamping each with its author are the first steps towards that.

## How we'll know it works

- Caregivers record doses during the round, not afterwards: most doses are recorded within an hour of their time.
- Few doses end up "not recorded".
- Family members sign in and read the care log, so the home gets fewer phone calls asking how a resident is.
- An inspector can be given a PDF summary for any resident and period in under a minute.
