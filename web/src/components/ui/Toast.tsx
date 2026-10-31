import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type Toast = { id: number; tone: 'ok' | 'bad'; text: string };
const Ctx = createContext<(text: string, tone?: 'ok' | 'bad') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'bad' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, tone, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === 'bad' ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((t) => (
          <div key={t.id} role="status" className={cn('pointer-events-auto flex max-w-md animate-slide-up items-center gap-3 rounded-xl border bg-ink-950 px-4 py-3 text-sm text-white shadow-pop', t.tone === 'bad' ? 'border-bad/40' : 'border-ink-800')}>
            {t.tone === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />}
            <span>{t.text}</span>
            <button type="button" aria-label="Sluiten / Close" className="-my-2 -mr-2 ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
