import Link from 'next/link';
import { DEMO_SCENARIOS, demoHref, scenarioHref, type DemoScenario } from '../demo/mode';

export default function ModeControls({ scenario = null, path = '/job-postings' }: { scenario?: DemoScenario | null; path?: string }) {
  if (!scenario) {
    return <div className="hu8-mode-controls"><span>Modo real</span><Link href={demoHref('/job-postings', 'listado')} className="hu8-board-textButton">Activar demostración</Link></div>;
  }

  return (
    <section className="hu8-demo-banner" aria-label="Modo demostración">
      <div className="hu8-mode-controls">
        <strong>Datos de demostración</strong>
        <Link href="/job-postings" className="hu8-board-textButton">Volver al modo real</Link>
      </div>
      <p>Ejemplos locales del proyecto anterior. Esta demostración no consulta Supabase ni la API real.</p>
      <details className="hu8-demo-scenarios">
        <summary>Probar estados: {DEMO_SCENARIOS.find((item) => item.value === scenario)?.label}</summary>
        <nav aria-label="Escenarios de demostración">
          {DEMO_SCENARIOS.map((item) => <Link key={item.value} href={scenarioHref(path, item.value)} aria-current={scenario === item.value ? 'page' : undefined} className="hu8-board-button">{item.label}</Link>)}
        </nav>
      </details>
    </section>
  );
}
