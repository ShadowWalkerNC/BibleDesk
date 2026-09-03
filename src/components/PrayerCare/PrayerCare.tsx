'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Download,
  ExternalLink,
  HeartHandshake,
  Mail,
  Plug,
  Plus,
  Unplug,
} from 'lucide-react';
import { createGmailComposeUrl, type ScheduleKind } from '@/lib/prayer-care';
import { getBrowserClient } from '@/lib/supabase';
import styles from './PrayerCare.module.css';

type Contact = {
  id: string;
  display_name: string;
  email: string | null;
  category: string;
  is_sensitive: boolean;
};

type Commitment = {
  id: string;
  title: string;
  private_details: string | null;
  schedule_kind: ScheduleKind;
  timezone: string;
  local_time: string;
  next_due_at: string;
  status: string;
  google_event_id: string | null;
  google_event_link: string | null;
  prayer_contacts: Contact;
};

type GoogleStatus = { connected: boolean; accountEmail: string | null };

type FollowupEditor = {
  commitmentId: string;
  recipient: string;
  subject: string;
  message: string;
  reviewed: boolean;
};

const SCHEDULE_LABELS: Record<ScheduleKind, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  one_time: 'One time',
};

export default function PrayerCare() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [google, setGoogle] = useState<GoogleStatus>({ connected: false, accountEmail: null });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followup, setFollowup] = useState<FollowupEditor | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [privateDetails, setPrivateDetails] = useState('');
  const [category, setCategory] = useState('friend');
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('weekly');
  const [localTime, setLocalTime] = useState('08:00');
  const [isSensitive, setIsSensitive] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!accessToken) throw new Error('Sign in to use private Prayer Care');
    const response = await fetch(path, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      cache: 'no-store',
    });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
    return { response, body };
  }, [accessToken]);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [contactResult, commitmentResult, googleResult] = await Promise.all([
        api('/api/prayer-care/contacts'),
        api('/api/prayer-care/commitments'),
        api('/api/google/status'),
      ]);
      setContacts(contactResult.body.contacts);
      setCommitments(commitmentResult.body.commitments);
      setGoogle(googleResult.body);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to load Prayer Care');
    }
  }, [accessToken, api]);

  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
      setSessionReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addPrayerItem(event: React.FormEvent) {
    event.preventDefault();
    setBusy('add');
    setError(null);
    setNotice(null);
    try {
      const contactResult = await api('/api/prayer-care/contacts', {
        method: 'POST',
        body: JSON.stringify({ displayName, email: email || null, category, isSensitive }),
      });
      await api('/api/prayer-care/commitments', {
        method: 'POST',
        body: JSON.stringify({
          contactId: contactResult.body.contact.id,
          title,
          privateDetails: privateDetails || null,
          scheduleKind,
          timezone,
          localTime,
        }),
      });
      setDisplayName('');
      setEmail('');
      setTitle('');
      setPrivateDetails('');
      setNotice('Prayer commitment added.');
      await refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add prayer commitment');
    } finally {
      setBusy(null);
    }
  }

  async function markPrayed(commitment: Commitment) {
    setBusy(`complete-${commitment.id}`);
    try {
      await api(`/api/prayer-care/commitments/${commitment.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setNotice(`Prayer recorded for ${commitment.prayer_contacts.display_name}.`);
      setFollowup({
        commitmentId: commitment.id,
        recipient: commitment.prayer_contacts.email || '',
        subject: 'Thinking of you and praying for you',
        message: `Hi ${commitment.prayer_contacts.display_name},\n\nI prayed for you today. How are you doing?\n\nNo pressure to reply.`,
        reviewed: false,
      });
      await refresh();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : 'Unable to record prayer');
    } finally {
      setBusy(null);
    }
  }

  async function connectGoogle() {
    setBusy('connect-google');
    try {
      const { body } = await api('/api/google/connect/start', { method: 'POST' });
      window.location.assign(body.authorizationUrl);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to start Google connection');
      setBusy(null);
    }
  }

  async function disconnectGoogle() {
    setBusy('disconnect-google');
    try {
      await api('/api/google/disconnect', { method: 'DELETE' });
      setGoogle({ connected: false, accountEmail: null });
      setNotice('Google account disconnected. Existing Google events and drafts were not deleted.');
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect Google');
    } finally {
      setBusy(null);
    }
  }

  async function exportCalendar(commitment: Commitment) {
    setBusy(`calendar-${commitment.id}`);
    try {
      const { body } = await api(`/api/prayer-care/commitments/${commitment.id}/calendar`, { method: 'POST' });
      setNotice(body.alreadyExported ? 'This commitment is already in Google Calendar.' : 'Added to Google Calendar.');
      await refresh();
    } catch (calendarError) {
      setError(calendarError instanceof Error ? calendarError.message : 'Unable to create calendar event');
    } finally {
      setBusy(null);
    }
  }

  async function downloadIcs(commitment: Commitment) {
    setBusy(`ics-${commitment.id}`);
    try {
      if (!accessToken) throw new Error('Sign in to download this private commitment');
      const response = await fetch(`/api/prayer-care/commitments/${commitment.id}/ics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Unable to download calendar file');
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `bibledesk-prayer-${commitment.id}.ics`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (icsError) {
      setError(icsError instanceof Error ? icsError.message : 'Unable to download calendar file');
    } finally {
      setBusy(null);
    }
  }

  function openFollowup(commitment: Commitment) {
    setFollowup({
      commitmentId: commitment.id,
      recipient: commitment.prayer_contacts.email || '',
      subject: 'Thinking of you and praying for you',
      message: `Hi ${commitment.prayer_contacts.display_name},\n\nYou were on my heart today. Is there anything specific I can keep praying about?\n\nNo pressure to reply.`,
      reviewed: false,
    });
  }

  function openGmailCompose() {
    if (!followup?.reviewed) return;
    window.open(
      createGmailComposeUrl(followup.recipient, followup.subject, followup.message),
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function createGmailDraft() {
    if (!followup?.reviewed) return;
    setBusy('gmail-draft');
    try {
      await api('/api/prayer-care/followups/gmail-draft', {
        method: 'POST',
        body: JSON.stringify(followup),
      });
      setNotice('Draft created in Gmail. BibleDesk did not send it.');
      setFollowup(null);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : 'Unable to create Gmail draft');
    } finally {
      setBusy(null);
    }
  }

  if (!sessionReady) {
    return <section id="prayer-care" className={styles.shell} aria-busy="true">Loading private Prayer Care…</section>;
  }

  if (!accessToken) {
    return (
      <section id="prayer-care" className={styles.shell}>
        <div className={styles.intro}>
          <HeartHandshake size={24} aria-hidden="true" />
          <div>
            <p className={styles.eyebrow}>Private Prayer Care</p>
            <h2>Remember people. Pray with intention. Follow up with care.</h2>
            <p>Your private circle and schedules are separate from the public PrayerAtlas board.</p>
          </div>
        </div>
        <a className={styles.primaryButton} href="/login">Sign in to begin</a>
      </section>
    );
  }

  return (
    <section id="prayer-care" className={styles.shell} aria-labelledby="prayer-care-title">
      <div className={styles.intro}>
        <HeartHandshake size={26} aria-hidden="true" />
        <div>
          <p className={styles.eyebrow}>Private Prayer Care</p>
          <h2 id="prayer-care-title">Today in Prayer</h2>
          <p>Private to your account. Follow-ups always stay in review until you open or draft them.</p>
        </div>
        <div className={styles.googleBox}>
          {google.connected ? (
            <>
              <span><Plug size={14} /> Google connected as {google.accountEmail}</span>
              <button type="button" onClick={disconnectGoogle} disabled={busy === 'disconnect-google'} className={styles.textButton}>
                <Unplug size={14} /> Disconnect
              </button>
            </>
          ) : (
            <button type="button" onClick={connectGoogle} disabled={busy === 'connect-google'} className={styles.secondaryButton}>
              <Plug size={15} /> {busy === 'connect-google' ? 'Connecting…' : 'Connect Google'}
            </button>
          )}
        </div>
      </div>

      {notice && <p className={styles.success} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <div className={styles.careGrid}>
        <form className={styles.addCard} onSubmit={addPrayerItem}>
          <div className={styles.cardHeading}>
            <Plus size={18} aria-hidden="true" />
            <h3>Add a person and prayer topic</h3>
          </div>
          <div className={styles.formGrid}>
            <label>
              Person or group
              <input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label>
              Email (optional)
              <input type="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className={styles.fullWidth}>
              Prayer topic
              <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Healing, discernment, family…" />
            </label>
            <label>
              Rhythm
              <select value={scheduleKind} onChange={(event) => setScheduleKind(event.target.value as ScheduleKind)}>
                {Object.entries(SCHEDULE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              Local prayer time
              <input type="time" required value={localTime} onChange={(event) => setLocalTime(event.target.value)} />
            </label>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {['family', 'friend', 'church', 'missions', 'healing', 'work', 'other'].map((value) => (
                  <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={isSensitive} onChange={(event) => setIsSensitive(event.target.checked)} />
              Hide details in future notification previews
            </label>
            <label className={styles.fullWidth}>
              Private details (optional)
              <textarea maxLength={5000} rows={3} value={privateDetails} onChange={(event) => setPrivateDetails(event.target.value)} />
            </label>
          </div>
          <p className={styles.timezone}>Times use {timezone}.</p>
          <button className={styles.primaryButton} disabled={busy === 'add'} type="submit">
            <Plus size={15} /> {busy === 'add' ? 'Adding…' : 'Add to Prayer Care'}
          </button>
        </form>

        <div className={styles.queueCard}>
          <div className={styles.cardHeading}>
            <CalendarPlus size={18} aria-hidden="true" />
            <h3>Upcoming commitments</h3>
            <span className={styles.count}>{commitments.length}</span>
          </div>
          {commitments.length === 0 ? (
            <p className={styles.empty}>Your upcoming prayer queue will appear here.</p>
          ) : (
            <ul className={styles.commitmentList}>
              {commitments.map((commitment) => (
                <li key={commitment.id} className={styles.commitment}>
                  <div>
                    <strong>{commitment.prayer_contacts.display_name}</strong>
                    <span>{commitment.title}</span>
                    <small>
                      {new Date(commitment.next_due_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      {' · '}{SCHEDULE_LABELS[commitment.schedule_kind]}
                    </small>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.prayedButton} onClick={() => markPrayed(commitment)} disabled={busy === `complete-${commitment.id}`}>
                      <Check size={14} /> Prayed
                    </button>
                    {google.connected ? (
                      commitment.google_event_id ? (
                        commitment.google_event_link
                          ? <a className={styles.actionLink} href={commitment.google_event_link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Calendar</a>
                          : <span className={styles.exported}>In Calendar</span>
                      ) : (
                        <button type="button" className={styles.actionButton} onClick={() => exportCalendar(commitment)} disabled={busy === `calendar-${commitment.id}`}>
                          <CalendarPlus size={14} /> Google Calendar
                        </button>
                      )
                    ) : (
                      <button type="button" className={styles.actionButton} onClick={() => downloadIcs(commitment)} disabled={busy === `ics-${commitment.id}`}>
                        <Download size={14} /> ICS
                      </button>
                    )}
                    <button type="button" className={styles.actionButton} onClick={() => openFollowup(commitment)}>
                      <Mail size={14} /> Follow up
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {followup && (
        <div className={styles.followupCard}>
          <div className={styles.cardHeading}>
            <Mail size={18} aria-hidden="true" />
            <h3>Review follow-up</h3>
          </div>
          <p>BibleDesk will never send this email. Review every field before opening Gmail or creating a draft.</p>
          <div className={styles.formGrid}>
            <label>
              Recipient
              <input type="email" required value={followup.recipient} onChange={(event) => setFollowup({ ...followup, recipient: event.target.value, reviewed: false })} />
            </label>
            <label>
              Subject
              <input maxLength={200} value={followup.subject} onChange={(event) => setFollowup({ ...followup, subject: event.target.value, reviewed: false })} />
            </label>
            <label className={styles.fullWidth}>
              Message
              <textarea rows={6} maxLength={10000} value={followup.message} onChange={(event) => setFollowup({ ...followup, message: event.target.value, reviewed: false })} />
            </label>
            <label className={`${styles.checkboxLabel} ${styles.fullWidth}`}>
              <input type="checkbox" checked={followup.reviewed} onChange={(event) => setFollowup({ ...followup, reviewed: event.target.checked })} />
              I reviewed the recipient, subject, and full message.
            </label>
          </div>
          <div className={styles.followupActions}>
            <button type="button" className={styles.secondaryButton} onClick={openGmailCompose} disabled={!followup.reviewed || !followup.recipient}>
              <ExternalLink size={15} /> Open Gmail compose
            </button>
            {google.connected && (
              <button type="button" className={styles.primaryButton} onClick={createGmailDraft} disabled={!followup.reviewed || busy === 'gmail-draft'}>
                <Mail size={15} /> {busy === 'gmail-draft' ? 'Creating draft…' : 'Create Gmail draft'}
              </button>
            )}
            <button type="button" className={styles.textButton} onClick={() => setFollowup(null)}>Cancel</button>
          </div>
        </div>
      )}
      <p className={styles.privacyNote}>
        {contacts.length} private contact{contacts.length === 1 ? '' : 's'} · Google access can be disconnected at any time.
      </p>
    </section>
  );
}

