import { fmtRelative } from '@/lib/format';
import { CHEERS } from '@shared/hero';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronRight, Copy, Eye, EyeOff, Share2, UserPlus, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, Dialog, ErrorState, Input, Spinner, useToast } from '@/components/ui';
import { HeroAvatar } from '@/components/hero/HeroAvatar';
import { SKILLS, friendSkillCard, skillLockLabel, titleFor, type FriendSkillCard, type SkillKey } from '@shared/hero';
import type { FriendsState, HeroFriend } from '@/lib/types';
import { useHero } from './HeroPages';

export const useFriends = () => useQuery({ queryKey: ['patient-hero-friends'], queryFn: () => api.get<FriendsState>('/patient/hero/friends') });

/** What friends see, and what they never see: shown before and after switching sharing on. */
function WhatIsShared() {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-ok/25 bg-ok-soft p-3">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900"><Eye className="h-4 w-4 text-ok" aria-hidden />{t('Vrienden zien', 'Friends see')}</p>
        <ul className="mt-1 list-disc pl-5 text-[13.5px] text-ink-700">
          <li>{t('de naam en het uiterlijk van je held', 'your hero’s name and look')}</li>
          <li>{t('je level en totaal level', 'your level and total level')}</li>
          <li>{t('je skill-levels (zoals Kracht en Balans)', 'your skill levels (such as Strength and Balance)')}</li>
          <li>{t('je gearscore', 'your gear score')}</li>
        </ul>
      </div>
      <div className="rounded-xl border border-line bg-canvas p-3">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900"><EyeOff className="h-4 w-4 text-ink-600" aria-hidden />{t('Vrienden zien nooit', 'Friends never see')}</p>
        <ul className="mt-1 list-disc pl-5 text-[13.5px] text-ink-700">
          <li>{t('je echte naam of e-mailadres', 'your real name or email address')}</li>
          <li>{t('je pijn, klachten of alarmsignalen', 'your pain, complaints or warning signs')}</li>
          <li>{t('je programma, oefeningen, praktijk of therapeut', 'your programme, exercises, practice or therapist')}</li>
          <li>{t('je muntjes', 'your coins')}</li>
        </ul>
      </div>
    </div>
  );
}

function readSkill(v: FriendSkillCard | number | undefined): FriendSkillCard {
  if (typeof v === 'number') return { level: v, locked: false, reason: null, phase: null };
  return v ?? { level: null, locked: true, reason: 'unavailable', phase: null };
}

function SkillGrid({ skills }: { skills: Record<SkillKey, FriendSkillCard | number> }) {
  const { locale } = useI18n();
  const nl = locale === 'nl';
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {SKILLS.map((k) => {
        const s = readSkill(skills[k.key]);
        const reason = s.locked ? skillLockLabel(s.reason, s.phase, nl) : null;
        return (
          <li key={k.key} className="rounded-lg bg-canvas px-1.5 py-1.5 text-center">
            <span className="block break-words text-[12px] leading-tight text-ink-600">{nl ? k.nl : k.en}</span>
            {reason ? (
              <span className="block break-words text-[11px] font-semibold leading-tight text-ink-700">{reason}</span>
            ) : (
              <span className="font-display text-[16px] font-bold tabular-nums text-ink-950"><span className="sr-only">level </span>{s.level}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FriendRow({ f, rank, me }: { f: { heroName: string; look: HeroFriend['look']; stats: NonNullable<HeroFriend['stats']> }; rank: number; me?: boolean }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className={cn('rounded-xl border p-3', me ? 'border-accent/30 bg-accent-soft' : 'border-line bg-white')}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="tap flex w-full items-center gap-3 text-left">
        {rank > 0 && <span className="w-6 shrink-0 text-center font-display text-[15px] font-bold tabular-nums text-ink-600"><span className="sr-only">{t('plek', 'rank')} </span>{rank}</span>}
        <HeroAvatar look={f.look} size={48} plain />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink-900">{f.heroName}</span>
          <span className="block text-[13px] text-ink-600">{me && <strong className="font-semibold text-accent">{t('Jij', 'You')} · </strong>}{t(`Level ${f.stats.level}`, `Level ${f.stats.level}`)} · {titleFor(f.stats.level, locale === 'nl')}{f.stats.gearScore !== undefined && <> · {t('gearscore', 'gear score')} {f.stats.gearScore}</>}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-display text-[18px] font-bold leading-none tabular-nums text-ink-950">{f.stats.totalLevel}</span>
          <span className="block text-[11.5px] text-ink-600">{t('totaal', 'total')}</span>
        </span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-ink-500 transition-transform', open && 'rotate-90')} aria-hidden />
      </button>
      {open && <div className="mt-3"><SkillGrid skills={f.stats.skills} /></div>}
    </li>
  );
}

/** Friends: opt-in, off by default. Mutual: a code plus acceptance. */
export function FriendsPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Vrienden', 'Friends'));
  const qc = useQueryClient();
  const toast = useToast();
  const q = useFriends();
  const hero = useHero();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['patient-hero-friends'] }), qc.invalidateQueries({ queryKey: ['patient-hero'] })]);
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      if (ok) toast(ok, 'ok');
      return true;
    } catch (e) {
      toast(describeError(e, locale), 'bad');
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data || !hero.data) return <Spinner />;
  const d = q.data;
  const back = (
    <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[14px] font-medium text-ink-600 hover:text-ink-900"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Mijn held', 'My hero')}</Link>
  );

  if (!d.hasHero || !hero.data.hero) {
    return (
      <div className="space-y-4">
        {back}
        <h1 className="t-page">{t('Vrienden', 'Friends')}</h1>
        <p className="text-[15px] text-ink-700">{t('Maak eerst je sportheld; daarna kun je vrienden toevoegen.', 'Create your sports hero first; then you can add friends.')}</p>
        <Link to="/p/held/nieuw" className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-accent-ink">{t('Held maken', 'Create hero')}</Link>
      </div>
    );
  }

  const friends = d.friends.filter((f) => f.kind === 'friend' && f.stats);
  const incoming = d.friends.filter((f) => f.kind === 'incoming');
  const outgoing = d.friends.filter((f) => f.kind === 'outgoing');
  const H = hero.data;
  const meRow = {
    heroName: H.hero!.heroName,
    look: { ...H.hero!, gear: H.gear.equipped },
    stats: { level: H.level.level, totalLevel: H.totalLevel, gearScore: H.gear.score, skills: Object.fromEntries(H.skills.map((k) => [k.key, friendSkillCard(k)])) as Record<SkillKey, FriendSkillCard> },
  };
  // Companions, never ranked by strength, clinical progress or recovery speed.
  const companions = [{ ...meRow, id: 'me', me: true }, ...friends.map((f) => ({ ...f, stats: f.stats!, me: false })).sort((a, b) => a.heroName.localeCompare(b.heroName))];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(d.sharing.code!);
      toast(t('Vriendcode gekopieerd', 'Friend code copied'), 'ok');
    } catch {
      toast(t('Kopiëren lukte niet. Schrijf de code over.', 'Copying failed. Write the code down.'), 'bad');
    }
  };
  const share = async () => {
    const text = t(`Word mijn vriend in FP Flow! Mijn vriendcode: ${d.sharing.code}`, `Be my friend in FP Flow! My friend code: ${d.sharing.code}`);
    try {
      await navigator.share({ text });
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="space-y-5">
      {back}
      <div>
        <h1 className="t-page">{t('Vrienden', 'Friends')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Vergelijk levels en skills met vrienden die ook revalideren. Alleen als jullie dat allebei willen.', 'Compare levels and skills with friends who are also recovering. Only when you both want to.')}</p>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="share-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="share-title" className="t-section">{t('Deel mijn held met vrienden', 'Share my hero with friends')}</h2>
            <p className="text-[13.5px] text-ink-600">{d.sharing.enabled ? t('Staat aan. Je kunt dit altijd uitzetten.', 'On. You can switch this off at any time.') : t('Staat uit. Niemand kan je vinden of zien.', 'Off. Nobody can find or see you.')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={d.sharing.enabled}
            aria-labelledby="share-title"
            disabled={busy === 'sharing'}
            onClick={() => (d.sharing.enabled ? setConfirmOff(true) : run('sharing', () => api.put('/patient/hero/sharing', { enabled: true }), t('Delen staat aan', 'Sharing is on')))}
            className={cn('tap relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2', d.sharing.enabled ? 'bg-accent' : 'bg-ink-300')}
          >
            <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow-xs transition-[left]', d.sharing.enabled ? 'left-7' : 'left-1')} />
          </button>
        </div>
        <div className="mt-4"><WhatIsShared /></div>
      </section>

      {d.sharing.enabled && (
        <>
          <section className="rounded-2xl border border-accent/25 bg-accent-soft p-5" aria-labelledby="code-title">
            <h2 id="code-title" className="t-section">{t('Jouw vriendcode', 'Your friend code')}</h2>
            <p className="text-[13.5px] text-ink-700">{t('Geef deze code aan een vriend. Die stuurt je een verzoek; jij kiest of je het accepteert.', 'Give this code to a friend. They send you a request; you decide whether to accept.')}</p>
            <p className="mt-3 select-all font-display text-[30px] font-bold tracking-[0.12em] text-ink-950" data-testid="friend-code">{d.sharing.code}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={copy}>{t('Kopiëren', 'Copy')}</Button>
              {'share' in navigator && <Button variant="secondary" icon={<Share2 className="h-4 w-4" aria-hidden />} onClick={share}>{t('Delen', 'Share')}</Button>}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="add-title">
            <h2 id="add-title" className="t-section">{t('Vriend toevoegen', 'Add a friend')}</h2>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!code.trim()) return;
                let msg = '';
                const ok = await run('add', async () => {
                  const r = await api.post<{ result: string }>('/patient/hero/friends', { code });
                  msg = r.result === 'accepted' ? t('Jullie zijn nu vrienden!', 'You are now friends!') : t('Verzoek verstuurd. Je vriend moet het nog accepteren.', 'Request sent. Your friend still has to accept it.');
                });
                if (ok) {
                  toast(msg, 'ok');
                  setCode('');
                }
              }}
            >
              <Input label={t('Code van je vriend', 'Your friend’s code')} placeholder="ABCD-2345" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} className="sm:flex-1" />
              <Button type="submit" size="lg" loading={busy === 'add'} icon={<UserPlus className="h-4 w-4" aria-hidden />}>{t('Verzoek sturen', 'Send request')}</Button>
            </form>
          </section>

          {incoming.length > 0 && (
            <section className="rounded-2xl border border-info/30 bg-white p-5 shadow-card" aria-labelledby="incoming-title">
              <h2 id="incoming-title" className="t-section">{t(`Verzoeken (${incoming.length})`, `Requests (${incoming.length})`)}</h2>
              <ul className="mt-3 space-y-2">
                {incoming.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                    <HeroAvatar look={f.look} size={44} plain />
                    <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink-900">{f.heroName}</span>
                    <span className="flex gap-2">
                      <Button size="sm" className="h-11" loading={busy === `acc-${f.id}`} icon={<Check className="h-4 w-4" aria-hidden />} onClick={() => run(`acc-${f.id}`, () => api.post(`/patient/hero/friends/${f.id}/accept`), t('Vriend toegevoegd', 'Friend added'))}>
                        {t('Accepteren', 'Accept')}
                      </Button>
                      <Button size="sm" variant="secondary" className="h-11" loading={busy === `dec-${f.id}`} aria-label={t(`Verzoek van ${f.heroName} weigeren`, `Decline request from ${f.heroName}`)} onClick={() => run(`dec-${f.id}`, () => api.del(`/patient/hero/friends/${f.id}`))}>
                        {t('Weigeren', 'Decline')}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(d.cheers ?? []).length > 0 && (
            <section className="rounded-2xl border border-accent/25 bg-accent-soft p-5" aria-labelledby="cheers-title">
              <h2 id="cheers-title" className="t-section">{t('Aanmoedigingen voor jou', 'Cheers for you')}</h2>
              <ul className="mt-2 space-y-1.5">
                {(d.cheers ?? []).slice(0, 8).map((c, i) => {
                  const ch = CHEERS.find((x) => x.key === c.cheer);
                  return (
                    <li key={i} className="flex items-center gap-2 text-[15px] text-ink-900">
                      <span aria-hidden>{ch?.emoji}</span>
                      <span className="min-w-0 flex-1"><strong className="font-semibold">{c.heroName}</strong>: {ch ? (locale === 'nl' ? ch.nl : ch.en) : ''}</span>
                      <span className="shrink-0 text-[12.5px] text-ink-600">{fmtRelative(c.at, locale)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="friends-title">
            <h2 id="friends-title" className="t-section">{t(`Teamgenoten (${friends.length} ${friends.length === 1 ? 'vriend' : 'vrienden'})`, `Companions (${friends.length} ${friends.length === 1 ? 'friend' : 'friends'})`)}</h2>
            <p className="text-[13.5px] text-ink-600">{t('Vrijwillig gedeelde sporthelden, zonder rangorde op herstel of kracht.', 'Voluntarily shared heroes, without recovery or strength ranking.')}</p>
            {friends.length === 0 && (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-canvas p-3 text-[14px] text-ink-700"><Users className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />{t('Nog geen vrienden. Deel je vriendcode om te beginnen.', 'No friends yet. Share your friend code to get started.')}</p>
            )}
            <ul className="mt-3 space-y-2" aria-label={t('Teamgenoten', 'Companions')}>
              {companions.map((f) => <FriendRow key={f.id} f={f} rank={0} me={f.me} />)}
            </ul>
            {friends.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="text-[14.5px] font-semibold text-ink-900">{t('Aanmoedigen', 'Cheer on')}</h3>
                <p className="text-[13px] text-ink-600">{t('Eén keer per dag per vriend, met een vaste tekst.', 'Once a day per friend, with a fixed text.')}</p>
                <ul className="mt-2 space-y-3">
                  {friends.map((f) => {
                    const done = (d.cheeredToday ?? []).includes(f.id);
                    return (
                      <li key={f.id}>
                        <p className="text-[14px] font-medium text-ink-800">{f.heroName}{done && <span className="ml-2 text-[13px] font-normal text-ok">{t('aangemoedigd vandaag', 'cheered today')}</span>}</p>
                        {!done && (
                          <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label={t(`${f.heroName} aanmoedigen`, `Cheer on ${f.heroName}`)}>
                            {CHEERS.map((c) => (
                              <button key={c.key} type="button" disabled={busy !== null} onClick={() => run(`ch-${f.id}`, () => api.post(`/patient/hero/friends/${f.id}/cheer`, { cheer: c.key }), t(`Verstuurd naar ${f.heroName}`, `Sent to ${f.heroName}`))}
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[14px] font-medium text-ink-800 hover:border-accent hover:bg-accent-soft disabled:opacity-60">
                                <span aria-hidden>{c.emoji}</span>{locale === 'nl' ? c.nl : c.en}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {friends.length > 0 && (
              <details className="mt-3 text-[14px]">
                <summary className="min-h-[44px] cursor-pointer py-2 font-medium text-ink-700">{t('Vriend verwijderen', 'Remove a friend')}</summary>
                <ul className="space-y-1">
                  {friends.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{f.heroName}</span>
                      <Button size="sm" variant="ghost" className="h-11" loading={busy === `rm-${f.id}`} icon={<X className="h-4 w-4" aria-hidden />} aria-label={t(`${f.heroName} verwijderen`, `Remove ${f.heroName}`)} onClick={() => run(`rm-${f.id}`, () => api.del(`/patient/hero/friends/${f.id}`), t('Vriend verwijderd', 'Friend removed'))}>
                        {t('Verwijderen', 'Remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          {hero.data && <TeamQuest d={hero.data} />}

          {outgoing.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="outgoing-title">
              <h2 id="outgoing-title" className="t-section">{t('Wacht op antwoord', 'Waiting for an answer')}</h2>
              <ul className="mt-2 space-y-1">
                {outgoing.map((f) => (
                  <li key={f.id} className="flex items-center gap-3">
                    <HeroAvatar look={f.look} size={36} plain />
                    <span className="min-w-0 flex-1 truncate text-[14.5px] text-ink-800">{f.heroName}</span>
                    <Button size="sm" variant="ghost" className="h-11" loading={busy === `cx-${f.id}`} aria-label={t(`Verzoek aan ${f.heroName} intrekken`, `Cancel request to ${f.heroName}`)} onClick={() => run(`cx-${f.id}`, () => api.del(`/patient/hero/friends/${f.id}`))}>
                      {t('Intrekken', 'Cancel')}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Dialog
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        size="sm"
        title={t('Delen uitzetten?', 'Switch sharing off?')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOff(false)}>{t('Annuleren', 'Cancel')}</Button>
            <Button
              variant="danger"
              loading={busy === 'sharing'}
              onClick={async () => {
                if (await run('sharing', () => api.put('/patient/hero/sharing', { enabled: false }), t('Delen staat uit', 'Sharing is off'))) setConfirmOff(false);
              }}
            >
              {t('Uitzetten', 'Switch off')}
            </Button>
          </>
        }
      >
        <p className="text-[15px] text-ink-700">{t('Je vriendenlijst en open verzoeken worden verwijderd en je vriendcode vervalt. Niemand ziet je held nog. Later kun je opnieuw beginnen met een nieuwe code.', 'Your friends list and open requests are removed and your friend code expires. Nobody sees your hero any more. You can start again later with a new code.')}</p>
      </Dialog>
    </div>
  );
}

/** Entry on the character sheet. */
/**
 * Team quest: together everyone does their own weekly goal. Separate consent on top of friend
 * sharing. The team only ever sees a group status, and only from five participants, so nobody's
 * week can be singled out. No XP or coins hang on it: no reason to train through pain for others.
 */
function TeamQuest({ d }: { d: import('@/lib/types').HeroState }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const team = d.team;
  if (!team) return null;
  const set = async (enabled: boolean) => {
    setBusy(true);
    try {
      await api.put('/patient/hero/team', { enabled });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(enabled ? t('Je doet mee aan de teamquest', 'You joined the team quest') : t('Je doet niet meer mee; je gegevens voor de teamquest zijn gewist', 'You left; your team quest data is removed'), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const status = !team.available
    ? t('Nog niet genoeg deelnemers. De teamquest start vanaf 5 teamgenoten die meedoen, zodat niemand herkenbaar is.', 'Not enough participants yet. The team quest starts from 5 companions who join, so nobody can be singled out.')
    : team.status === 'complete'
      ? t('Gehaald! Iedereen heeft deze week zijn eigen doel gedaan. 🎉', 'Done! Everyone did their own goal this week. 🎉')
      : t('Bezig: nog niet iedereen heeft zijn weekdoel gedaan. Er is nog tijd.', 'In progress: not everyone has done their weekly goal yet. There is still time.');
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="team-title">
      <h2 id="team-title" className="t-section flex items-center gap-2"><Users className="h-5 w-5 text-accent" aria-hidden />{t('Teamquest: samen sterk', 'Team quest: stronger together')}</h2>
      <p className="mt-1 text-[14px] text-ink-700">{t('Deze week doet iedereen zijn eigen weekdoel. Een rustweek of een pauze van je fysiotherapeut telt ook als gehaald.', 'This week everyone does their own weekly goal. A rest week or a pause from your physiotherapist also counts as done.')}</p>
      {team.enabled ? (
        <>
          <p className={cn('mt-3 rounded-xl p-3 text-[14.5px] font-medium', team.available && team.status === 'complete' ? 'bg-ok-soft text-ok' : 'bg-canvas text-ink-800')} role="status">{status}</p>
          <Button variant="ghost" className="mt-2" loading={busy} onClick={() => set(false)}>{t('Niet meer meedoen', 'Leave the team quest')}</Button>
        </>
      ) : (
        <>
          <ul className="mt-3 space-y-1 text-[13.5px] text-ink-700">
            <li>• {t('Je team ziet alleen of het team als geheel zijn doel haalt, nooit wie wat deed.', 'Your team only sees whether the team as a whole makes it, never who did what.')}</li>
            <li>• {t('Er gaat geen pijn, programma of kracht naar je team.', 'No pain, programme or strength goes to your team.')}</li>
            <li>• {t('Je kunt altijd stoppen; dan worden je teamgegevens direct gewist.', 'You can stop any time; your team data is then removed straight away.')}</li>
          </ul>
          <Button className="mt-3" loading={busy} disabled={!team.canJoin} onClick={() => set(true)}>{t('Meedoen aan de teamquest', 'Join the team quest')}</Button>
          {!team.canJoin && <p className="mt-1 text-[13px] text-ink-600">{t('Zet eerst delen met vrienden aan.', 'Switch on sharing with friends first.')}</p>}
        </>
      )}
    </section>
  );
}

export function FriendsCard() {
  const { t } = useI18n();
  const q = useFriends();
  const d = q.data;
  const friends = d?.friends.filter((f) => f.kind === 'friend').length ?? 0;
  const incoming = d?.friends.filter((f) => f.kind === 'incoming').length ?? 0;
  // Cheers from the last two days, newest first.
  const fresh = (d?.cheers ?? []).filter((c) => Date.now() - new Date(c.at).getTime() < 2 * 86400_000);
  const cheer = fresh[0] && CHEERS.find((x) => x.key === fresh[0].cheer);
  return (
    <Link to="/p/held/vrienden" className="tap flex items-center gap-3 rounded-2xl border border-line bg-white p-5 shadow-card hover:border-ink-300">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft"><Users className="h-5 w-5 text-accent" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="t-card block">{t('Vrienden', 'Friends')}</span>
        <span className="block text-[13.5px] text-ink-600">
          {cheer && fresh[0] ? <>{cheer.emoji} {t(`${fresh[0].heroName}: ${cheer.nl}`, `${fresh[0].heroName}: ${cheer.en}`)}{fresh.length > 1 ? t(` (+${fresh.length - 1})`, ` (+${fresh.length - 1})`) : ''}</> : !d ? '…' : !d.sharing.enabled ? t('Uit · vergelijk levels met vrienden als je wilt', 'Off · compare levels with friends if you like') : incoming ? t(`${incoming} nieuw verzoek${incoming > 1 ? 'en' : ''}`, `${incoming} new request${incoming > 1 ? 's' : ''}`) : t(`${friends} ${friends === 1 ? 'vriend' : 'vrienden'}`, `${friends} ${friends === 1 ? 'friend' : 'friends'}`)}
        </span>
      </span>
      {incoming > 0 && <span className="rounded-full bg-info px-2 py-0.5 text-[12px] font-bold text-white">{incoming}</span>}
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
    </Link>
  );
}
