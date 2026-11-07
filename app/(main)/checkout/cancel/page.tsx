export default function CheckoutCancel() {
  return (
    <main className="mx-auto max-w-[480px] px-8 py-20">
      <div className="flex items-center gap-2 font-mono text-[13px] text-fg3"><span className="h-1.5 w-1.5 rounded-full bg-current" /> CANCELLED</div>
      <h1 className="mt-4 text-[40px] font-medium leading-[1.1] tracking-[-0.02em]">Payment cancelled</h1>
      <p className="mt-3 text-fg2">No money was taken. Go back to your assistant to try again.</p>
    </main>
  );
}
