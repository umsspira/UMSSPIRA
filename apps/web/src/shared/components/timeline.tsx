'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';

import type { TimelineSection } from '@/modules/profile/data/profile-data';
import CertificationItem from '@/modules/profile/ver/certification-item';

const SECTION_CERTIFICATIONS = 'CERTIFICACIONES';

type TimelineProps = {
  sections: TimelineSection[];
};

function Connector() {
  return (
    <div className="relative flex w-6 shrink-0 justify-center" aria-hidden="true">
      <span className="absolute inset-y-0 w-0.5 bg-truffle-trouble" />
      <span className="relative mt-1.5 h-3 w-3 rounded-full border-2 border-palladian bg-truffle-trouble" />
    </div>
  );
}

// HU-21, CA-02: el resumen ya no muestra etiquetas de validación de respaldos («Respaldo verificado»...)
export default function Timeline({ sections }: TimelineProps) {
  // Solo una certificación abierta a la vez; todas cerradas al inicio
  const [openCertification, setOpenCertification] = useState<string | null>(null);

  return (
    <div className="w-full">
      {sections.map((section) => (
        <section key={section.title}>
          {/* Título de la sección */}
          <div className="flex gap-4 pb-5">
            <Connector />
            <h2 className="text-sm font-extrabold uppercase tracking-[0.2em] text-truffle-trouble">
              {section.title}
            </h2>
          </div>

          {section.items.length === 0 && (
            <p className="pb-8 pl-10 text-sm font-medium text-blue-fantastic/60">Sin registros</p>
          )}

          {section.items.map((item) =>
            section.title === SECTION_CERTIFICATIONS ? (
              <article key={`${section.title}-${item.title}`} className="flex gap-4">
                <Connector />
                <CertificationItem
                  item={item}
                  isOpen={openCertification === item.title}
                  onToggle={() =>
                    setOpenCertification((current) => (current === item.title ? null : item.title))
                  }
                />
              </article>
            ) : (
              <article key={`${section.title}-${item.title}`} className="flex gap-4">
                <Connector />

                <div className="flex min-w-0 flex-1 flex-col gap-2 pb-8">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
                    {/* Información principal */}
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-xl font-bold leading-6 text-blue-fantastic">{item.title}</h3>
                      <p className="text-sm font-medium text-blue-fantastic/80">{item.subtitle}</p>
                      {item.detail && <p className="text-xs text-blue-fantastic/60">{item.detail}</p>}
                    </div>

                    {/* Fecha */}
                    {item.date && (
                      <span
                        className={`shrink-0 text-sm ${
                          section.dateTone === 'muted'
                            ? 'font-semibold text-blue-fantastic/60'
                            : 'font-bold text-truffle-trouble'
                        }`}
                      >
                        {item.date}
                      </span>
                    )}
                  </div>

                  {/* Documento de respaldo */}
                  {item.document &&
                    (item.documentUrl ? (
                      // Cada respaldo abre su propio archivo (E2.2)
                      <a
                        href={item.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-oatmeal bg-white px-2 py-1.5 text-[11px] font-semibold text-blue-fantastic transition hover:bg-palladian"
                      >
                        <FileText className="h-3.5 w-3.5 text-truffle-trouble" aria-hidden="true" />
                        {item.document}
                      </a>
                    ) : (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-oatmeal bg-white px-2 py-1.5 text-[11px] font-semibold text-blue-fantastic">
                        <FileText className="h-3.5 w-3.5 text-truffle-trouble" aria-hidden="true" />
                        {item.document}
                      </span>
                    ))}
                </div>
              </article>
            ),
          )}
        </section>
      ))}
    </div>
  );
}