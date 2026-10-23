import type { ReactNode } from 'react';
import { Logo, LocaleSwitch } from '@/components/app/Brand';

export function AuthLayout({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <LocaleSwitch />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-16">
        <div className="w-full max-w-[400px]">
          <div className="card px-6 py-7 sm:px-8 sm:py-8">
            <h1 className="text-xl font-bold">{title}</h1>
            {description && <p className="mt-1.5 text-[14px] text-ink-500">{description}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-[13.5px] text-ink-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
