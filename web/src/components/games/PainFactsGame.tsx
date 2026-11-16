import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { Check, X } from 'lucide-react';
import { GAME_THEME, GameButton, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
import type { GameProps } from './types';

type Card = { nl: string; en: string; fact: boolean; whyNl: string; whyEn: string };

/**
 * Statements in the spirit of modern pain education (pain as protection, sensitivity, graded
 * activity). General explanations, not personal medical advice.
 */
const DECK: Card[] = [
  {
    nl: 'Pijn betekent altijd dat er schade is in je lichaam.', en: 'Pain always means there is damage in your body.', fact: false,
    whyNl: 'Pijn is een beschermsignaal. Je kunt pijn hebben zonder schade, en hoeveel pijn je voelt zegt niet precies hoeveel er beschadigd is.',
    whyEn: 'Pain is a protective signal. You can have pain without damage, and how much it hurts does not tell exactly how much is damaged.',
  },
  {
    nl: 'Pijn wordt gemaakt door je hersenen, als bescherming.', en: 'Pain is made by your brain, as protection.', fact: true,
    whyNl: 'Je hersenen wegen alle signalen en ervaringen af en beslissen of bescherming nodig is. Daarom is pijn altijd echt, ook zonder schade.',
    whyEn: 'Your brain weighs all signals and experiences and decides whether protection is needed. That is why pain is always real, even without damage.',
  },
  {
    nl: 'Bij rugpijn is in bed blijven liggen het beste.', en: 'With back pain, staying in bed is best.', fact: false,
    whyNl: 'Bij de meeste rugpijn helpt rustig blijven bewegen beter dan bedrust. Lang stilliggen maakt je vaak stijver en kan herstel vertragen.',
    whyEn: 'For most back pain, gently keeping moving helps more than bed rest. Lying still for long often makes you stiffer and can slow recovery.',
  },
  {
    nl: 'Een scan zegt weinig over hoeveel pijn je hebt.', en: 'A scan says little about how much pain you have.', fact: true,
    whyNl: 'Veel mensen zonder pijn hebben ‘slijtage’ of een uitstulping op een scan. Wat je op een foto ziet, past vaak slecht bij hoeveel pijn iemand heeft.',
    whyEn: 'Many people without pain have ‘wear and tear’ or a bulging disc on a scan. What a scan shows often fits poorly with how much pain someone has.',
  },
  {
    nl: 'Stress en slecht slapen kunnen pijn erger maken.', en: 'Stress and poor sleep can make pain worse.', fact: true,
    whyNl: 'Je zenuwstelsel staat dan meer ‘op scherp’. Goed slapen en ontspannen kunnen helpen om pijn te verminderen.',
    whyEn: 'Your nervous system is then more ‘on alert’. Good sleep and relaxing can help reduce pain.',
  },
  {
    nl: 'Pijn tijdens bewegen betekent altijd dat je moet stoppen.', en: 'Pain while moving always means you must stop.', fact: false,
    whyNl: 'Een beetje pijn bij oefenen is vaak veilig en hoort bij sterker worden. Wordt de pijn scherp, steeds erger of blijft hij lang hangen, stop dan en overleg met je fysiotherapeut.',
    whyEn: 'A little pain while exercising is often safe and part of getting stronger. If the pain becomes sharp, keeps getting worse or lingers for long, stop and talk to your physiotherapist.',
  },
  {
    nl: 'Pijn die lang blijft, komt meestal doordat er nog steeds iets kapot is.', en: 'Pain that lasts long is usually because something is still broken.', fact: false,
    whyNl: 'Weefsel herstelt meestal binnen enkele maanden. Bij langdurige pijn is vaak het alarmsysteem gevoeliger geworden, niet het lichaam verder beschadigd.',
    whyEn: 'Tissue usually heals within a few months. With long-lasting pain, often the alarm system has become more sensitive, not the body more damaged.',
  },
  {
    nl: 'Je zenuwstelsel kan gevoeliger worden, waardoor iets sneller pijn doet.', en: 'Your nervous system can become more sensitive, so things hurt sooner.', fact: true,
    whyNl: 'Bij langdurige pijn kan het alarm ‘harder’ gaan staan. Het goede nieuws: met rustig opbouwen kan het ook weer minder gevoelig worden.',
    whyEn: 'With long-lasting pain the alarm can get ‘louder’. The good news: by building up gently it can become less sensitive again.',
  },
  {
    nl: 'Slijtage op een foto betekent dat je klachten alleen maar erger worden.', en: 'Wear and tear on an X-ray means your symptoms will only get worse.', fact: false,
    whyNl: 'Slijtage hoort bij ouder worden, net als grijs haar. Veel mensen met slijtage hebben weinig klachten, en klachten kunnen ook weer minder worden.',
    whyEn: 'Wear and tear is part of getting older, like grey hair. Many people with it have few symptoms, and symptoms can also get better.',
  },
  {
    nl: 'Wat je denkt en voelt over pijn, kan invloed hebben op je pijn.', en: 'What you think and feel about pain can affect your pain.', fact: true,
    whyNl: 'Zorgen en angst kunnen het alarm versterken. Begrijpen wat er gebeurt, maakt pijn vaak minder bedreigend.',
    whyEn: 'Worry and fear can turn the alarm up. Understanding what is going on often makes pain feel less threatening.',
  },
  {
    nl: 'Een hernia gaat nooit meer vanzelf over.', en: 'A herniated disc never gets better on its own.', fact: false,
    whyNl: 'Bij veel mensen wordt een hernia vanzelf kleiner en nemen de klachten in de loop van weken tot maanden af.',
    whyEn: 'In many people a herniated disc shrinks on its own and symptoms ease over weeks to months.',
  },
  {
    nl: 'Je rug is sterk en kan veel hebben.', en: 'Your back is strong and can handle a lot.', fact: true,
    whyNl: 'Je wervelkolom is stevig gebouwd. Buigen en tillen mag; je lichaam went eraan als je het rustig opbouwt.',
    whyEn: 'Your spine is sturdily built. Bending and lifting are allowed; your body gets used to it when you build up gently.',
  },
  {
    nl: 'Bij langdurige pijn zijn pijnstillers de enige oplossing.', en: 'With long-lasting pain, painkillers are the only solution.', fact: false,
    whyNl: 'Medicijnen kunnen soms helpen, maar bewegen, uitleg en goed slapen zijn vaak minstens zo belangrijk. Overleg over medicijnen altijd met je huisarts.',
    whyEn: 'Medicines can sometimes help, but moving, understanding and good sleep are often at least as important. Always discuss medicines with your GP.',
  },
  {
    nl: 'Tillen met een rechte rug is de enige veilige manier.', en: 'Lifting with a straight back is the only safe way.', fact: false,
    whyNl: 'Er is niet één juiste manier om te tillen. Tillen met een ronde rug is niet vanzelf gevaarlijk; je lichaam past zich aan wat je oefent.',
    whyEn: 'There is no single right way to lift. Lifting with a rounded back is not dangerous in itself; your body adapts to what you practise.',
  },
  {
    nl: 'Stap voor stap opbouwen helpt om weer meer te kunnen.', en: 'Building up step by step helps you do more again.', fact: true,
    whyNl: 'Door rustig en regelmatig iets meer te doen, went je lichaam eraan. Je fysiotherapeut maakt hier graag een plan voor met je.',
    whyEn: 'By doing a little more, calmly and regularly, your body gets used to it. Your physiotherapist is happy to make a plan for this with you.',
  },
  {
    nl: 'Als iets pijn doet, moet je dat lichaamsdeel zoveel mogelijk sparen.', en: 'If something hurts, you should spare that body part as much as possible.', fact: false,
    whyNl: 'Kort sparen kan na een blessure helpen, maar te lang ontzien maakt spieren zwakker en gewrichten stijver. Weer gebruiken helpt bij herstel.',
    whyEn: 'Resting it briefly after an injury can help, but sparing it too long makes muscles weaker and joints stiffer. Using it again helps recovery.',
  },
  {
    nl: 'Pijn is echt, ook als er op een scan niets te zien is.', en: 'Pain is real, even if nothing shows on a scan.', fact: true,
    whyNl: 'Dat er niets te zien is, betekent niet dat je het je inbeeldt. Pijn ontstaat in je zenuwstelsel en is altijd echt.',
    whyEn: 'Nothing showing does not mean you are imagining it. Pain is produced by your nervous system and is always real.',
  },
  {
    nl: 'Een krakend gewricht betekent dat er iets kapot is.', en: 'A cracking joint means something is broken.', fact: false,
    whyNl: 'Kraken en knakken van gewrichten is heel gewoon en meestal onschuldig, zeker als het geen pijn doet.',
    whyEn: 'Joints cracking and popping is very common and usually harmless, especially when it does not hurt.',
  },
];

const TH = GAME_THEME.pain_facts;
const GREEN = 'linear-gradient(135deg, #b8f5d2, #3fcf86)';
const RED = 'linear-gradient(135deg, #ffc2b8, #ff6b5b)';
/** Myth: warm red glass. Fact: cool green glass. */
const MYTH_STYLE = { background: 'linear-gradient(160deg, rgba(255,120,100,.26), rgba(255,80,60,.10))', borderColor: 'rgba(255,140,120,.5)', color: '#ffd3ca', boxShadow: '0 12px 28px -14px rgba(255,90,70,.75), inset 0 1px 0 rgba(255,255,255,.14)' };
const FACT_STYLE = { background: 'linear-gradient(160deg, rgba(110,230,170,.24), rgba(60,200,130,.09))', borderColor: 'rgba(120,230,170,.5)', color: '#c9f7dd', boxShadow: '0 12px 28px -14px rgba(60,210,140,.7), inset 0 1px 0 rgba(255,255,255,.14)' };

const ROUND = 10;
const SWIPE = 70;

function draw(): Card[] {
  const a = [...DECK];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as Card, a[i] as Card];
  }
  return a.slice(0, ROUND);
}

/**
 * Pain: myth or fact? Ten statements a round. Answer with the buttons, by swiping the card (left is
 * myth, right is fact) or with the arrow keys; then read why and go on.
 */
export default function PainFactsGame({ onDone }: GameProps) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [deck] = useState(draw);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<{ fact: boolean; right: boolean } | null>(null);
  const [right, setRight] = useState(0);
  const [dx, setDx] = useState(0);
  const rightRef = useRef(0);
  const drag = useRef<{ id: number; x: number } | null>(null);
  const nextWrap = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const card = deck[idx];
  const last = idx >= deck.length - 1;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDoneRef.current(rightRef.current);
  };

  const choose = (fact: boolean) => {
    if (answer || !card || done.current) return;
    const ok = card.fact === fact;
    if (ok) {
      rightRef.current += 1;
      setRight(rightRef.current);
      sfx.good();
      haptic(12);
    } else {
      sfx.bad();
      haptic([20, 30, 20]);
    }
    setResults((r) => [...r, ok]);
    setAnswer({ fact, right: ok });
    setDx(0);
  };
  const next = () => {
    if (!answer) return;
    if (last) {
      if (rightRef.current >= 7) sfx.win();
      finish();
      return;
    }
    sfx.tap();
    setAnswer(null);
    setIdx((i) => i + 1);
  };

  // Arrow keys answer (left = myth, right = fact).
  const keyHandler = useRef<(e: globalThis.KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || answer) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); choose(false); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); choose(true); }
  };
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (answer) nextWrap.current?.querySelector('button')?.focus();
  }, [answer]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (answer) return;
    drag.current = { id: e.pointerId, x: e.clientX };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    setDx(e.clientX - drag.current.x);
  };
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const d = e.clientX - drag.current.x;
    drag.current = null;
    if (d <= -SWIPE) choose(false);
    else if (d >= SWIPE) choose(true);
    else setDx(0);
  };
  const onCancel = () => {
    drag.current = null;
    setDx(0);
  };

  if (!card) return null;
  const tilt = Math.max(-1, Math.min(1, dx / 160));
  const lean = Math.min(1, Math.abs(dx) / SWIPE);
  const dragging = !!drag.current;

  return (
    <Stage game="pain_facts" testId="pain_facts-game" className="select-none">
      <Hud>
        <HudPill label={t('Vraag', 'Question')} value={`${idx + 1}/${deck.length}`} />
        <HudPill label={t('Goed', 'Right')} accent={TH.soft} value={<span data-testid="pain-right" aria-label={t(`${right} goed`, `${right} right`)}>{right}</span>} />
      </Hud>
      {/* One dot per question: green right, red wrong, the current one ringed. */}
      <ol className="mb-4 flex items-center justify-center gap-1.5" aria-label={t(`Vraag ${idx + 1} van ${deck.length}`, `Question ${idx + 1} of ${deck.length}`)}>
        {deck.map((_, k) => {
          const r = results[k];
          const current = k === idx;
          return (
            <li
              key={k}
              aria-hidden
              className={`rounded-full transition-all duration-300 ${current ? 'h-3 w-3' : 'h-2 w-2'}`}
              style={
                r === true
                  ? { background: GREEN, boxShadow: '0 0 8px rgba(95,211,154,.9)' }
                  : r === false
                    ? { background: RED, boxShadow: '0 0 8px rgba(255,107,91,.9)' }
                    : current
                      ? { background: 'rgba(255,255,255,.9)', boxShadow: `0 0 0 3px ${TH.glow}55, 0 0 10px ${TH.glow}` }
                      : { background: 'rgba(255,255,255,.16)' }
              }
            />
          );
        })}
      </ol>

      <div className="[perspective:1000px]">
        <div
          ref={cardRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          className={`relative mx-auto flex min-h-[230px] w-full max-w-md touch-pan-y flex-col items-center justify-center overflow-hidden rounded-[24px] border p-5 text-center backdrop-blur-xl ${dragging ? '' : 'transition-[transform,border-color,box-shadow] duration-300 ease-out'} ${answer && !answer.right ? 'game-shake' : ''}`}
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.07) 45%, rgba(255,255,255,.03) 100%)',
            borderColor: answer ? (answer.right ? 'rgba(95,211,154,.75)' : 'rgba(255,107,91,.75)') : 'rgba(255,255,255,.16)',
            boxShadow: answer
              ? `0 24px 50px -22px rgba(0,0,0,.9), 0 0 40px -10px ${answer.right ? 'rgba(95,211,154,.7)' : 'rgba(255,107,91,.7)'}, inset 0 1px 0 rgba(255,255,255,.18)`
              : `0 24px 50px -22px rgba(0,0,0,.9), 0 0 44px -18px ${TH.glow}, inset 0 1px 0 rgba(255,255,255,.18)`,
            transform: answer ? undefined : `translateX(${dx}px) rotateY(${tilt * 14}deg) rotate(${tilt * 6}deg)`,
          }}
          data-testid="pain-card"
        >
          {/* Sheen, and a red or green wash while swiping */}
          <div aria-hidden className="pointer-events-none absolute -left-1/4 -top-1/2 h-full w-[150%] rotate-[-8deg] bg-gradient-to-b from-white/[.10] to-transparent" />
          {!answer && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ opacity: lean * 0.9, background: dx < 0 ? 'linear-gradient(90deg, rgba(255,107,91,.35), transparent 70%)' : 'linear-gradient(270deg, rgba(95,211,154,.35), transparent 70%)' }}
            />
          )}
          {!answer && Math.abs(dx) > 20 && (
            <span
              aria-hidden
              className={`absolute top-3 rounded-full border px-3 py-1 text-[13px] font-black uppercase tracking-[.12em] backdrop-blur-md ${dx < 0 ? 'left-3' : 'right-3'}`}
              style={dx < 0 ? { ...MYTH_STYLE, opacity: 0.4 + lean * 0.6 } : { ...FACT_STYLE, opacity: 0.4 + lean * 0.6 }}
            >
              {dx < 0 ? t('Mythe', 'Myth') : t('Feit', 'Fact')}
            </span>
          )}
          <div key={idx} className="game-rise relative">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-white/45">{t('Mythe of feit?', 'Myth or fact?')}</p>
            <p className="mt-2 text-[20px] font-bold leading-snug text-white drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]">{nl ? card.nl : card.en}</p>
          </div>
          {answer && (
            <div className="game-rise relative mt-4 w-full rounded-2xl border border-white/10 bg-black/20 p-3.5 text-left" role="status" aria-live="polite" data-testid="pain-feedback">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="game-pop grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={answer.right ? { background: GREEN, boxShadow: '0 0 18px rgba(95,211,154,.8)' } : { background: RED, boxShadow: '0 0 18px rgba(255,107,91,.8)' }}
                >
                  {answer.right ? <Check className="h-5 w-5 text-[#06301b]" strokeWidth={3.2} /> : <X className="h-5 w-5 text-[#3a0a05]" strokeWidth={3.2} />}
                </span>
                <p className="text-[16px] font-extrabold leading-tight" style={{ color: answer.right ? '#9df0c2' : '#ffb3a6' }}>
                  {answer.right ? t('Goed!', 'Right!') : t('Niet helemaal.', 'Not quite.')} {card.fact ? t('Dit is een feit.', 'This is a fact.') : t('Dit is een mythe.', 'This is a myth.')}
                </p>
              </div>
              <p className="mt-2 text-[14.5px] leading-snug text-white/85">{nl ? card.whyNl : card.whyEn}</p>
            </div>
          )}
        </div>
      </div>

      {answer ? (
        <div ref={nextWrap} className="mt-4">
          <GameButton className="w-full text-[18px]" data-testid="pain-next" onClick={next}>{last ? t('Klaar', 'Done') : t('Volgende', 'Next')}</GameButton>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="pain-myth"
              onClick={() => choose(false)}
              className="relative min-h-[68px] overflow-hidden rounded-2xl border text-[19px] font-extrabold backdrop-blur-md transition duration-150 hover:brightness-110 active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              style={MYTH_STYLE}
            >
              <span aria-hidden>←</span> {t('Mythe', 'Myth')}
            </button>
            <button
              type="button"
              data-testid="pain-fact"
              onClick={() => choose(true)}
              className="relative min-h-[68px] overflow-hidden rounded-2xl border text-[19px] font-extrabold backdrop-blur-md transition duration-150 hover:brightness-110 active:scale-[.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              style={FACT_STYLE}
            >
              {t('Feit', 'Fact')} <span aria-hidden>→</span>
            </button>
          </div>
          <p className="mt-3 text-center text-[12.5px] leading-snug text-white/55">{t('Je kunt de kaart ook naar links (mythe) of rechts (feit) vegen, of de pijltjestoetsen gebruiken.', 'You can also swipe the card left (myth) or right (fact), or use the arrow keys.')}</p>
        </>
      )}

      <p className="mt-3 text-center text-[12px] leading-snug text-white/45">{t('Algemene uitleg, geen persoonlijk medisch advies. Je fysiotherapeut kan je hier meer over vertellen.', 'General information, not personal medical advice. Your physiotherapist can tell you more about this.')}</p>
      <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}
