export default function BeneficiosPage() {
  return (
    <div className="bg-[#EEE9DF] min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-600 font-bold mb-2">
            BENEFICIOS
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900">
            Beneficios exclusivos para titulados
          </h1>
          <p className="text-slate-600 mt-4 text-sm sm:text-base leading-relaxed">
            Como miembro de la red UMSSPIRA, tienes acceso a una serie de ventajas pensadas para impulsar tu desarrollo profesional y mantenerte conectado con la universidad.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {[
            { t: 'Acceso al directorio', d: 'Contacta a otros titulados y amplía tu red profesional.' },
            { t: 'Bolsa de trabajo', d: 'Postula a ofertas exclusivas publicadas por empresas aliadas.' },
            { t: 'Eventos y talleres', d: 'Participa en capacitaciones gratuitas o con descuento.' },
            { t: 'Mentorías', d: 'Recibe guía de profesionales con más experiencia.' }
          ].map((x, i) => (
            <div key={i} className="bg-[#F5F2EA] p-6 rounded-2xl border border-[#C9C1B1] shadow-sm space-y-2">
              <h3 className="text-lg font-bold text-slate-900">{x.t}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{x.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}