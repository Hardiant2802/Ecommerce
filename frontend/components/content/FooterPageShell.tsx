import { ReactNode } from 'react';

interface FooterPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function FooterPageShell({ title, subtitle, children }: FooterPageShellProps) {
  return (
    <div className="relative overflow-hidden py-10 md:py-14">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-50 via-red-50/40 to-slate-50" />
      <div className="absolute -top-24 -right-20 -z-10 h-72 w-72 rounded-full bg-red-200/30 blur-3xl" />
      <div className="absolute -bottom-28 -left-20 -z-10 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="container-custom max-w-5xl">
        <div className="mb-8 rounded-2xl border border-red-100 bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
          <p className="mb-2 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">AH Phone Store</p>
          <h1 className="text-2xl font-bold text-gray-900 md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600 md:text-base">{subtitle}</p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

interface FooterSectionProps {
  title: string;
  children: ReactNode;
}

export function FooterSection({ title, children }: FooterSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-7">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 md:text-xl">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-700 md:text-base">{children}</div>
    </section>
  );
}
