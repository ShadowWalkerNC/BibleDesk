# Prayer Care Workflow

> Status: Implemented (Phase A: Private Prayer Circle & Pastoral Care Workflow)
> Added: 2026-09-03
> Schema: supabase/schema-v5.sql
> Product area: Church tools / personal prayer
> Related surface: `/prayer` & `/api/prayer/circle`

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

## Product Principles

- **Prayer before productivity:** The interface should feel calm and pastoral, not like a sales CRM or streak-driven task manager.
- **Private by default:** Names, contact details, prayer notes, and schedules are visible only to their owner unless explicitly shared.
- **Human review before outreach:** BibleDesk may prepare a follow-up draft, but it must never email or message someone without the user reviewing and approving it.
- **Consent and discretion:** Sensitive prayer details should not be copied into follow-up messages automatically. Contacts must be able to opt out of messages.
- **Graceful rhythms:** Missing a reminder should not create guilt-oriented warnings or break a streak. Users can snooze, reschedule, or pause commitments.
- **Local-first capture:** A user should be able to add a prayer item and record a check-in while offline, with authenticated sync later.

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

Every table must use Row Level Security so only the owning user can read or modify private records. Shared ministry-team access should be a later, explicit permission layer rather than part of the MVP.

## Technical Approach

### Client

- Add the private prayer views to the existing `/prayer` route.
- Use IndexedDB for offline prayer contacts, commitments, due items, and unsynced check-ins.
- Add a service worker for scheduled local/PWA notifications where supported.
- Queue offline mutations and reconcile them after authentication and connectivity return.

### Server and Supabase

- Add a versioned Supabase migration for the five tables, constraints, indexes, and RLS policies.
- Add authenticated REST routes for contacts, commitments, check-ins, preferences, and follow-up drafts.
- Calculate `next_due_at` server-side from the recurrence rule and user timezone.
- Use a scheduled Supabase Edge Function or protected Vercel Cron endpoint to create due notification jobs.
- Make reminder processing idempotent so retries cannot create duplicate notifications.

### Messaging

- Phase 1: in-app/PWA reminders and copy-to-clipboard follow-ups.
- Phase 2: opt-in email delivery.
- Phase 3: WhatsApp, SMS, Discord, and ministry-team integrations.
- All outbound delivery requires an explicit user approval event with an audit timestamp.

## Acceptance Criteria

- A signed-in user can add a private person and daily or weekly prayer commitment.
- The due commitment appears in `Today in Prayer` at the correct local time.
- The user can mark it prayed, add a private note, and see the next due date.
- The user can review, edit, and copy a follow-up message.
- No follow-up can be transmitted without explicit approval.
- Sensitive entries hide identifying details in notification previews.
- Private prayer records are inaccessible to other users under Supabase RLS tests.
- A missed reminder can be snoozed or resumed without punitive streak messaging.
- Core capture and check-in work offline and sync without duplicate records.

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

