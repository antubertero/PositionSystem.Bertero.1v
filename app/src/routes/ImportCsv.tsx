import plantillaCsv from '../assets/plantilla_personas.csv?url';

export default function ImportCsv() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Importación CSV</h2>
        <p className="text-slate-600">Descargue la plantilla y cargue personas en lote.</p>
      </header>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <ol className="list-decimal space-y-4 pl-5 text-sm text-slate-700">
          <li>
            <a className="font-semibold text-slate-900 underline" href={plantillaCsv} download>
              Descargue la plantilla CSV
            </a>
          </li>
          <li>
            Complete los datos requeridos (nombre, rol, unidad) y opcionales (jerarquía, especialidad).
          </li>
          <li>
            Cargue el archivo en la consola de administración (próximamente) o utilice el endpoint `/people` para automatizar.
          </li>
        </ol>
      </div>
    </section>
  );
}
