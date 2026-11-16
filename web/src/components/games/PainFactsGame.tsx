import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
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
  const nextBtn = useRef<HTMLButtonElement>(null);
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
    }
    setAnswer({ fact, right: ok });
    setDx(0);
  };
  const next = () => {
    if (!answer) return;
    if (last) {
      finish();
      return;
    }
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
    if (answer) nextBtn.current?.focus();
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

  return (
    <div className="flex flex-col gap-4 select-none" data-testid="pain_facts-game">
      <p className="text-center text-[14px] text-ink-600">
        {t(`Vraag ${idx + 1} van ${deck.length}`, `Question ${idx + 1} of ${deck.length}`)} · <span className="font-semibold text-ink-900" data-testid="pain-right">{t(`${right} goed`, `${right} right`)}</span>
      </p>

      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        className={`relative mx-auto flex min-h-[200px] w-full max-w-md touch-pan-y flex-col items-center justify-center rounded-2xl border-2 p-5 text-center shadow-card ${
          answer ? (answer.right ? 'border-ok bg-ok-soft' : 'border-bad bg-bad-soft') : 'border-line bg-white'
        } ${drag.current ? '' : 'transition-transform duration-200'}`}
        style={answer ? undefined : { transform: `translateX(${dx}px) rotate(${tilt * 6}deg)` }}
        data-testid="pain-card"
      >
        {!answer && Math.abs(dx) > 20 && (
          <span aria-hidden className={`absolute top-3 rounded-full px-2.5 py-0.5 text-[13px] font-bold text-white ${dx < 0 ? 'left-3 bg-[#b5674a]' : 'right-3 bg-[#3f8a62]'}`}>{dx < 0 ? t('Mythe', 'Myth') : t('Feit', 'Fact')}</span>
        )}
        <p className="text-[19px] font-semibold leading-snug text-ink-950">{nl ? card.nl : card.en}</p>
        {answer && (
          <div className="mt-3 animate-fade-in" role="status" aria-live="polite" data-testid="pain-feedback">
            <p className={`text-[16px] font-bold ${answer.right ? 'text-ok' : 'text-bad'}`}>
              {answer.right ? t('Goed!', 'Right!') : t('Niet helemaal.', 'Not quite.')} {card.fact ? t('Dit is een feit.', 'This is a fact.') : t('Dit is een mythe.', 'This is a myth.')}
            </p>
            <p className="mt-1.5 text-[14.5px] leading-snug text-ink-800">{nl ? card.whyNl : card.whyEn}</p>
          </div>
        )}
      </div>

      {answer ? (
        <Button ref={nextBtn} size="xl" className="w-full" data-testid="pain-next" onClick={next}>{last ? t('Klaar', 'Done') : t('Volgende', 'Next')}</Button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" data-testid="pain-myth" onClick={() => choose(false)} className="min-h-[64px] rounded-2xl border-2 border-[#d9a58f] bg-[#fbeee8] text-[18px] font-bold text-[#8a3f22] active:translate-y-px">
              ← {t('Mythe', 'Myth')}
            </button>
            <button type="button" data-testid="pain-fact" onClick={() => choose(true)} className="min-h-[64px] rounded-2xl border-2 border-[#93c7a8] bg-[#e8f5ec] text-[18px] font-bold text-[#245c3d] active:translate-y-px">
              {t('Feit', 'Fact')} →
            </button>
          </div>
          <p className="text-center text-[12.5px] text-ink-500">{t('Je kunt de kaart ook naar links (mythe) of rechts (feit) vegen, of de pijltjestoetsen gebruiken.', 'You can also swipe the card left (myth) or right (fact), or use the arrow keys.')}</p>
        </>
      )}

      <p className="text-center text-[12.5px] text-ink-500">{t('Algemene uitleg, geen persoonlijk medisch advies. Je fysiotherapeut kan je hier meer over vertellen.', 'General information, not personal medical advice. Your physiotherapist can tell you more about this.')}</p>
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
      </div>
    </div>
  );
}
