import { useEffect, useState } from 'react';
import { fetchDiagnostics } from '../lib/api';

export default function Diagnostics() {
  const [data, setData] = useState<{ health: any; status: any[] }>();

  useEffect(() => {
    fetchDiagnostics().then(setData);
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Diagnóstico</h2>
        <p className="text-slate-600">Información de salud del backend y último snapshot.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold">Salud del backend</h3>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
            {JSON.stringify(data?.health, null, 2) || 'Cargando...'}
          </pre>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold">Snapshot</h3>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
            {JSON.stringify(data?.status, null, 2) || 'Cargando...'}
          </pre>
        </article>
      </div>
    </section>
  );
}
