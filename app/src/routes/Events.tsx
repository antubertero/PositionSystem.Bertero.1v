import { FormEvent, useState } from 'react';
import { sendEvent, fetchStatusNow } from '../lib/api';

const defaultPayload = {
  person_id: 1,
  source: 'biometric',
  type: 'entry',
  ts: new Date().toISOString(),
  payload: {}
};

export default function Events() {
  const [event, setEvent] = useState(JSON.stringify(defaultPayload, null, 2));
  const [status, setStatus] = useState<any[]>([]);
  const [result, setResult] = useState<string>('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(event);
      parsed.ts = parsed.ts || new Date().toISOString();
      const res = await sendEvent(parsed);
      setResult(JSON.stringify(res, null, 2));
      const now = await fetchStatusNow();
      setStatus(now);
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-4 rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        <div>
          <h2 className="text-2xl font-semibold">Sandbox de eventos</h2>
          <p className="text-slate-600 text-sm">Pruebe señales de presencia y verifique la resolución de estados.</p>
        </div>
        <label className="block text-sm">
          <span className="mb-2 block font-medium">Evento JSON</span>
          <textarea
            className="h-64 w-full rounded border border-slate-300 font-mono text-sm"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">
          Enviar evento
        </button>
        {result && (
          <pre className="rounded bg-slate-900 p-3 text-xs text-slate-100">{result}</pre>
        )}
      </form>
      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-semibold">Estado actual</h3>
          <ul className="space-y-2 text-sm">
            {status.map((item) => (
              <li key={item.person_id} className="rounded border border-slate-100 p-2">
                <span className="font-semibold">Persona {item.person_id}</span>: {item.status} ({item.source})
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </section>
  );
}
