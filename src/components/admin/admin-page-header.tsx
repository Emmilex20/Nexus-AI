type AdminPageHeaderProps = {
  title: string;
  description?: string;
};

export function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
        Admin
      </p>

      <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
        {title}
      </h1>

      {description ? (
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}
