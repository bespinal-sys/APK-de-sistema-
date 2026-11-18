import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { STATUSES, severityOf, statusOf } from '../lib/constants.js';

export default function FindingList({ findings, numbers, onSelect, onClose }) {
  const [filter, setFilter] = useState('todos');
  const sorted = [...findings].sort((a, b) => numbers.get(a.id) - numbers.get(b.id));
  const shown = filter === 'todos' ? sorted : sorted.filter((f) => f.status === filter);

  return (
    <Sheet title={`Hallazgos (${findings.length})`} onClose={onClose} tall>
      <div className="chips filter-row">
        <button className={`chip${filter === 'todos' ? ' on neutral' : ''}`} onClick={() => setFilter('todos')}>
          Todos
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.id}
            className={`chip${filter === s.id ? ' on' : ''}`}
            style={filter === s.id ? { background: s.color, borderColor: s.color } : { borderColor: s.color, color: s.color }}
            onClick={() => setFilter(s.id)}
          >
            {s.label} ({findings.filter((f) => f.status === s.id).length})
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="muted center pad">No hay hallazgos para mostrar.</p>}

      <ul className="finding-list">
        {shown.map((f) => {
          const sev = severityOf(f.severity);
          const st = statusOf(f.status);
          return (
            <li key={f.id}>
              <button onClick={() => onSelect(f.id)}>
                <span className="dot" style={{ background: sev.color }}>
                  {numbers.get(f.id)}
                </span>
                <span className="info">
                  <strong>{f.title}</strong>
                  <small>
                    {sev.label} · <span style={{ color: st.color }}>{st.label}</span>
                    {f.photos && f.photos.length > 0 ? ` · 📷 ${f.photos.length}` : ''}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
