export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-12">
      <div className="skeleton h-3 w-24 rounded-full" />
      <div className="skeleton mt-5 h-12 w-2/3 rounded-2xl" />
      <div className="skeleton mt-3 h-4 w-1/2 rounded-full" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton aspect-[4/3] rounded-[24px]" />
        ))}
      </div>
    </main>
  );
}
