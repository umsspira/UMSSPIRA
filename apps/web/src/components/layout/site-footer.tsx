export async function SiteFooter() {
  "use cache";
  return (
    <footer className="border-t border-[oklch(0.91_0.008_80)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-center text-xs text-[oklch(0.5_0.01_60)] sm:flex-row sm:text-left">
        <p>© {new Date().getFullYear()} UMSS Vinculación Laboral · Universidad Mayor de San Simón</p>
        <p>Cochabamba, Bolivia</p>
      </div>
    </footer>
  );
}
