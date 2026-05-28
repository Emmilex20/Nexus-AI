type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300 sm:text-sm">
          {eyebrow}
        </p>
      ) : null}

      <h1 className="mt-2 text-balance text-3xl font-black text-white sm:text-4xl">
        {title}
      </h1>

      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}
