import Image from "next/image";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 md:p-8">
      <Image src="/images/anhnen.jpg" alt="Background" fill priority className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-slate-950/50" />

      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-2xl backdrop-blur-md">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-white/80">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
