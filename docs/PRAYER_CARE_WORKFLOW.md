# Prayer Care Workflow

> Status: First increment implemented in code; migration/OAuth setup not deployed
> Added: 2026-09-03
> Product area: Church tools / personal prayer
> Related surface: `/prayer`

## Product Idea

BibleDesk should help a person remember who they committed to pray for, build a sustainable prayer rhythm, record when they prayed, and follow up with care.

The core loop is:

1. Add a person or group to a private prayer list.
2. Choose a daily, weekly, monthly, or custom prayer schedule.
3. Receive a reminder when that person is due.
4. Mark the prayer as completed and optionally add a private note.
5. Review and send a follow-up email or message to the person.
6. Continue the schedule, snooze it, pause it, or mark the request answered.

This expands the existing public prayer board and PrayerAtlas with a private pastoral-care workflow. It is useful for individuals, pastors, ministry teams, small-group leaders, and churches.

## Implemented First Increment (2026-09-03)

- `schema-v5.sql` defines the five private Prayer Care tables plus `google_connections`, constraints, indexes, owner-only RLS, and service-role-only OAuth storage. The migration is not applied.
- `/prayer` keeps the existing PrayerAtlas globe and community feed, and adds a signed-in Today in Prayer surface for creating a person/topic, scheduling daily/weekly/monthly/one-time prayer, listing upcoming commitments, and marking a commitment prayed.
- Authenticated APIs create/list contacts and commitments, record `prayed` check-ins, download private ICS events, expose Google connection status/disconnect, create idempotent Google Calendar events, and create Gmail drafts after explicit review.
- Every API derives the owner from a verified Supabase bearer token. It does not accept a body-supplied owner ID.
- Google OAuth is direct between each user, BibleDesk, and Google. It uses signed expiring state plus an httpOnly cookie; tokens are AES-256-GCM encrypted at rest and refreshed server-side.
- Gmail integration creates drafts only. The editable review UI also offers a Gmail compose URL fallback; it never sends automatically.
- The Chrome side panel opens `/prayer#prayer-care` for Today in Prayer and export actions while leaving authentication and private data in the web app. PWA/Electron/Android wrappers use the shared web route.

Not yet implemented: reminder delivery, browser notifications, quiet-hour UI/API, snooze/skip/answered flows, check-in history UI, offline/IndexedDB sync, selected weekdays/custom recurrence, team sharing, and SMS/WhatsApp delivery.

## Product Principles

- **Prayer before productivity:** The interface should feel calm and pastoral, not like a sales CRM or streak-driven task manager.
- **Private by default:** Names, contact details, prayer notes, and schedules are visible only to their owner. Sharing is not part of this increment.
- **Human review before outreach:** BibleDesk may prepare a follow-up draft, but it must never email or message someone without the user reviewing and approving it.
- **Consent and discretion:** Sensitive prayer details should not be copied into follow-up messages automatically. Contacts must be able to opt out of messages.
- **Graceful rhythms:** Missing a reminder should not create guilt-oriented warnings or break a streak. Users can snooze, reschedule, or pause commitments.
- **Local-first capture (planned):** Offline capture and later authenticated sync remain roadmap work.

## MVP

### Prayer Circle

- Create a private prayer contact with a display name and optional email or phone number.
- Add one or more prayer topics without requiring contact information.
- Assign a category such as Family, Friend, Church, Missions, Healing, Work, or Custom.
- Mark especially sensitive entries so notification previews hide names and details.
- Archive a contact without deleting prayer history.

### Prayer Rhythm

- Schedule a commitment as daily, selected weekdays, weekly, monthly, or one-time.
- Choose a preferred reminder time and timezone.
- Pause, snooze, reschedule, or end a commitment.
- Show a calm "Today in Prayer" queue on `/prayer`.
- Support browser/PWA notifications first, with optional email reminders after the core flow is reliable.

### Prayer Check-in

- Actions: `Prayed`, `Snooze`, `Skip today`, and `Mark answered`.
- Allow an optional private journal note after `Prayed`.
- Record check-in history without public activity feeds or competitive streaks.
- Offer a brief follow-up prompt after prayer: "Would you like to check in with this person?"

### Follow-up

- Provide editable templates such as:
  - "I prayed for you today. How are you doing?"
  - "You were on my heart today. Is there anything specific I can keep praying about?"
  - "Checking in after your prayer request. No pressure to reply."
- Let the user choose email, SMS, WhatsApp, or copy-to-clipboard when the channel is available.
- Always show the final recipient, channel, subject, and complete message before sending.
- Never include private prayer notes in a message unless the user deliberately inserts them.
- Store draft and sent-status metadata, but avoid retaining third-party message contents longer than necessary.

## Primary User Flow

```text
/prayer
  -> Today in Prayer
  -> Open person
  -> Review prayer topics
  -> Mark "Prayed"
  -> Add optional private note
  -> Review optional follow-up draft
  -> Send, copy, schedule for later, or dismiss
```

## Suggested Information Architecture

Add a segmented view to `/prayer`:

- **Today:** Due and overdue prayer commitments.
- **My Circle:** Private people, groups, and recurring commitments.
- **Community:** Existing public or church prayer board.
- **World:** Existing PrayerAtlas experience.
- **Answered:** Answered prayers and gratitude journal.

The mobile experience should make `Prayed`, `Snooze`, and `Follow up` reachable with one thumb. Notification deep links should open directly to the relevant private prayer card.

## Data Model

Suggested Supabase tables:

### `prayer_contacts`

- `id UUID PRIMARY KEY`
- `owner_id UUID REFERENCES auth.users`
- `display_name TEXT NOT NULL`
- `email TEXT`
- `phone TEXT`
- `category TEXT`
- `is_sensitive BOOLEAN DEFAULT false`
- `is_archived BOOLEAN DEFAULT false`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `prayer_commitments`

- `id UUID PRIMARY KEY`
- `owner_id UUID REFERENCES auth.users`
- `contact_id UUID REFERENCES prayer_contacts`
- `title TEXT NOT NULL`
- `private_details TEXT`
- `recurrence_rule TEXT`
- `timezone TEXT NOT NULL`
- `next_due_at TIMESTAMPTZ`
- `status TEXT` (`active`, `paused`, `answered`, `archived`)
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

### `prayer_checkins`

- `id UUID PRIMARY KEY`
- `owner_id UUID REFERENCES auth.users`
- `commitment_id UUID REFERENCES prayer_commitments`
- `outcome TEXT` (`prayed`, `snoozed`, `skipped`, `answered`)
- `private_note TEXT`
- `completed_at TIMESTAMPTZ`
- `next_due_at TIMESTAMPTZ`

### `prayer_followups`

- `id UUID PRIMARY KEY`
- `owner_id UUID REFERENCES auth.users`
- `contact_id UUID REFERENCES prayer_contacts`
- `checkin_id UUID REFERENCES prayer_checkins`
- `channel TEXT` (`email`, `sms`, `whatsapp`, `clipboard`)
- `recipient TEXT`
- `subject TEXT`
- `message TEXT`
- `status TEXT` (`draft`, `approved`, `sent`, `failed`, `dismissed`)
- `approved_at TIMESTAMPTZ`
- `sent_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ`

### `prayer_notification_preferences`

- `owner_id UUID PRIMARY KEY REFERENCES auth.users`
- `timezone TEXT NOT NULL`
- `quiet_hours_start TIME`
- `quiet_hours_end TIME`
- `browser_enabled BOOLEAN`
- `email_enabled BOOLEAN`
- `digest_mode TEXT` (`individual`, `daily_digest`)

### `google_connections`

- `owner_id UUID PRIMARY KEY REFERENCES auth.users`
- `google_account_email TEXT`
- `encrypted_access_token TEXT`
- `encrypted_refresh_token TEXT`
- `token_expires_at TIMESTAMPTZ`
- `scopes TEXT[]`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

Unlike the prayer tables, this table has no browser policy and revokes `anon` and `authenticated` grants. Only service-role server code may read it, and API responses never include encrypted token fields.

Every table must use Row Level Security so only the owning user can read or modify private records. Shared ministry-team access should be a later, explicit permission layer rather than part of the MVP.

## Technical Approach

### Client

- Add the private prayer views to the existing `/prayer` route.
- Keep PrayerAtlas and the public feed intact beside the private view.
- Planned: use IndexedDB for offline prayer contacts, commitments, due items, and unsynced check-ins.
- Planned: add a service worker for scheduled local/PWA notifications and reconcile queued mutations.

### Server and Supabase

- Implemented: versioned migration for private tables, constraints, indexes, RLS, and server-only Google connections.
- Implemented: authenticated routes for contact/commitment create/list, prayer completion, ICS, Google connection/export, and Gmail drafts.
- Implemented: calculate initial/next due times server-side for daily, weekly, monthly, and one-time schedules using the user's IANA timezone.
- Planned: preferences APIs, scheduled notification jobs, custom recurrence, and idempotent reminder delivery.

### Messaging

- Current first increment: editable Gmail compose handoff and Gmail draft creation; no delivery.
- Planned Phase 1: in-app/PWA reminders and copy-to-clipboard follow-ups.
- Planned Phase 2+: any opt-in delivery, WhatsApp, SMS, Discord, and ministry-team integrations.
- All outbound delivery requires an explicit user approval event with an audit timestamp.

## Acceptance Criteria

- [x] A signed-in user can add a private person and daily, weekly, monthly, or one-time prayer commitment.
- [x] The upcoming commitment appears in `Today in Prayer` using a server-computed due time and IANA timezone.
- [x] The user can mark it prayed; the API accepts a private note and advances recurring schedules.
- [x] The user can review/edit a follow-up and open Gmail compose or create a Gmail draft.
- [x] No follow-up is sent by BibleDesk; the Gmail API route creates a draft only.
- Sensitive entries hide identifying details in notification previews.
- [ ] Run deployed Supabase RLS integration tests after applying schema v5 in a non-production project.
- A missed reminder can be snoozed or resumed without punitive streak messaging.
- [ ] Core capture and check-in work offline and sync without duplicate records.

## Delivery Plan

### Phase A: Private Prayer Circle

- Supabase schema and RLS
- Prayer contacts and commitments
- `Today in Prayer` queue
- Check-ins, private notes, answered status

### Phase B: Reminders

- Timezone-aware recurrence engine
- PWA/browser notifications
- Quiet hours, snooze, and daily digest
- Vercel or Supabase scheduled delivery worker

### Phase C: Follow-up

- Template library and editable drafts
- Copy-to-clipboard
- Opt-in email delivery
- WhatsApp/SMS/Discord adapters

### Phase D: Ministry Teams

- Explicit shared prayer circles and roles
- Assignment and handoff
- Church care dashboard
- Aggregate reporting that never exposes private prayer content

## Open Decisions

- Should private Prayer Circle data remain separate from the public prayer board, or should users be able to deliberately promote an item to the community board?
- Which reminder channel should follow browser/PWA notifications: email, WhatsApp, or SMS?
- Should follow-up messages be stored after sending, or should BibleDesk retain only delivery metadata?
- Should an answered prayer automatically stop its recurrence or ask the user whether to continue in gratitude mode?
