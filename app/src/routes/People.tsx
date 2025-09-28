import { FormEvent, useEffect, useState } from 'react';
import { createPerson, fetchPeople } from '../lib/api';

interface Person {
  id: number;
  name: string;
  role?: string;
  hierarchy?: string;
  specialty?: string;
  unit?: string;
}

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState({ name: '', role: '', hierarchy: '', specialty: '', unit: '' });

  useEffect(() => {
    fetchPeople().then(setPeople);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.role) return;
    await createPerson(form);
    setForm({ name: '', role: '', hierarchy: '', specialty: '', unit: '' });
    const updated = await fetchPeople();
    setPeople(updated);
  };

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Personas</h2>
          <p className="text-slate-600">Alta y gestión de personal operativo.</p>
        </div>
      </header>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
        <h3 className="text-lg font-semibold">Alta rápida</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(['name', 'role', 'hierarchy', 'specialty', 'unit'] as const).map((field) => (
            <label key={field} className="text-sm">
              <span className="mb-1 block font-medium capitalize">{field}</span>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2"
                value={(form as any)[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required={field === 'name' || field === 'role'}
              />
            </label>
          ))}
        </div>
        <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white" type="submit">
          Crear persona
        </button>
      </form>

      <table className="min-w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
        <thead className="bg-slate-100 text-left text-sm uppercase text-slate-600">
          <tr>
            <th className="px-4 py-2">Nombre</th>
            <th className="px-4 py-2">Rol</th>
            <th className="px-4 py-2">Jerarquía</th>
            <th className="px-4 py-2">Especialidad</th>
            <th className="px-4 py-2">Unidad</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id} className="border-t border-slate-100 text-sm">
              <td className="px-4 py-2 font-medium">{person.name}</td>
              <td className="px-4 py-2">{person.role}</td>
              <td className="px-4 py-2">{person.hierarchy}</td>
              <td className="px-4 py-2">{person.specialty}</td>
              <td className="px-4 py-2">{person.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
