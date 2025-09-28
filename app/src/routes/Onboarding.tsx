const steps = [
  {
    title: 'Conectar fuentes',
    description: 'Configure integraciones de biometría, geocercas y tareas.'
  },
  {
    title: 'Cargar personal',
    description: 'Importe personas y defina sus roles, jerarquías y unidades.'
  },
  {
    title: 'Simular eventos',
    description: 'Use el sandbox para validar las reglas de estado en tiempo real.'
  }
];

export default function Onboarding() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-3xl font-semibold">Bienvenido</h2>
        <p className="text-slate-600">
          Complete los siguientes pasos para activar el Sistema General de Control de Personal en Tiempo Real.
        </p>
      </header>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              {index + 1}
            </span>
            <h3 className="text-xl font-bold">{step.title}</h3>
            <p className="text-sm text-slate-600">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
