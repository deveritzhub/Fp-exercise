import { useEffect, useRef, useState } from 'react';
import { BOXING } from '@shared/adventure';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';

/**
 * A round on the bag: one of three pads lights up on every beat; hit it before the next one.
 * A game of timing for adventure XP, not a measure of fitness.
 */
export function BoxingRound({ onDone }: { onDone: (hits: number) => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<'ready' | 'on' | 'done'>('ready');
  const [beat, setBeat] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const got = useRef(false);
  const hitsRef = useRef(0);

  useEffect(() => {
    if (state !== 'on') return;
    if (beat >= BOXING.beats) {
      setLit(null);
      setState('done');
      onDone(hitsRef.current);
      return;
    }
    got.current = false;
    setLit((prev) => {
      // Never the same pad twice in a row: the eye has to move.
      const next = (Math.floor(Math.random() * 2) + 1 + (prev ?? 0)) % 3;
      return next;
    });
    const id = window.setTimeout(() => setBeat((b) => b + 1), BOXING.beatMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, beat]);

  const punch = (i: number) => {
    if (state !== 'on' || got.current || i !== lit) return;
    got.current = true;
    hitsRef.current += 1;
    setHits(hitsRef.current);
    setLit(null);
  };
  const pads = [t('Links', 'Left'), t('Midden', 'Middle'), t('Rechts', 'Right')];

  return (
    <div className="space-y-4" data-testid="boxing-round" data-state={state}>
      <p className="text-[15px] text-ink-800">
        {state === 'ready' ? t(`Tik op het vlak dat oplicht, ${BOXING.beats} keer achter elkaar. Elke rake klap is ${BOXING.xpPerHit} avonturen-XP.`, `Tap the pad that lights up, ${BOXING.beats} times in a row. Every hit is ${BOXING.xpPerHit} adventure XP.`)
          : state === 'on' ? t(`Klap ${Math.min(beat + 1, BOXING.beats)} van ${BOXING.beats}`, `Punch ${Math.min(beat + 1, BOXING.beats)} of ${BOXING.beats}`)
          : t(`Ronde klaar: ${hits} van ${BOXING.beats} raak.`, `Round done: ${hits} of ${BOXING.beats} hit.`)}
      </p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('De bokszak', 'The bag')}>
        {pads.map((label, i) => (
          <button key={label} type="button" data-pad={i} data-lit={lit === i} disabled={state !== 'on'} onPointerDown={() => punch(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') punch(i); }}
            className="h-28 rounded-2xl border-2 border-[#7a2f24] bg-[#f6e3e1] text-[15px] font-semibold text-[#7a2f24] transition-colors data-[lit=true]:border-[#c2201f] data-[lit=true]:bg-[#c2201f] data-[lit=true]:text-white disabled:opacity-60 motion-reduce:transition-none">
            {label}
          </button>
        ))}
      </div>
      <p className="text-center font-display text-[22px] font-bold tabular-nums text-ink-950" aria-live="polite">{hits} <span className="text-[14px] font-medium text-ink-600">{t('raak', 'hit')}</span></p>
      {state === 'ready' && <Button size="lg" className="w-full" data-testid="start-round" onClick={() => { hitsRef.current = 0; setHits(0); setBeat(0); setState('on'); }}>{t('Start de ronde', 'Start the round')}</Button>}
    </div>
  );
}
