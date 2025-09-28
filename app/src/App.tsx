import { NavLink, Route, Routes } from 'react-router-dom';
import Onboarding from './routes/Onboarding';
import People from './routes/People';
import ImportCsv from './routes/ImportCsv';
import Events from './routes/Events';
import Diagnostics from './routes/Diagnostics';

const navItems = [
  { to: '/', label: 'Onboarding' },
  { to: '/people', label: 'Personas' },
  { to: '/import', label: 'Importar CSV' },
  { to: '/events', label: 'Sandbox de eventos' },
  { to: '/diagnostics', label: 'Diagnóstico' }
];

function App() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white p-6 space-y-4">
        <h1 className="text-2xl font-bold">Control Personal</h1>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded px-3 py-2 transition ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`
              }
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/people" element={<People />} />
          <Route path="/import" element={<ImportCsv />} />
          <Route path="/events" element={<Events />} />
          <Route path="/diagnostics" element={<Diagnostics />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
