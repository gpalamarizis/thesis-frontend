import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { reports, people } from '../../api';
import { fmtDate, trunc } from '../../utils/format';

/**
 * TaskActionsCalendar — Ημερολόγιο λοιπών ενεργειών με φίλτρα.
 */
function TaskActionsCalendar({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  const [lawyers, setLawyers] = useState([]);
  const [filters, setFilters] = useState({
    dikigoros_id: '',
    ekkremis: '',
  });

  useEffect(() => {
    people.lawyers.list()
      .then(d => setLawyers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    reports.pendingTasks()
      .then(d => {
        let list = Array.isArray(d) ? d : (d?.data || []);
        if (filters.dikigoros_id) list = list.filter(e => String(e.dikigoros_id) === filters.dikigoros_id);
        if (filters.ekkremis !== '') list = list.filter(e =>
          filters.ekkremis === 'true' ? e.ekkremis !== false : e.ekkremis === false
        );
        setEvents(list);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const monthName = monthCursor.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(y, m, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const byDay = {};
  events.forEach(e => {
    if (!e.date_dead_line) return;
    const d = new Date(e.date_dead_line);
    if (isNaN(d.getTime()) || d.getMonth() !== m || d.getFullYear() !== y) return;
    const day = d.getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });

  const today = new Date();
  const isToday = (day) => today.getDate() === day && today.getMonth() === m && today.getFullYear() === y;
  const isPast = (day) => {
    const d = new Date(y, m, day);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const cells = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(<div key={`e${i}`} className="cal-cell cal-empty" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = byDay[day] || [];
    const isSel = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === m && selectedDate.getFullYear() === y;
    const hasOverdue = dayEvents.some(e => e.ekkremis !== false) && isPast(day);
    cells.push(
      <div
        key={day}
        className={`cal-cell ${isToday(day) ? 'cal-today' : ''} ${dayEvents.length ? 'cal-has-events' : ''} ${isSel ? 'cal-selected' : ''} ${hasOverdue ? 'cal-overdue' : ''}`}
        onClick={() => setSelectedDate(new Date(y, m, day))}
      >
        <div className="cal-day-num">{day}</div>
        {dayEvents.slice(0, 3).map((e, i) => (
          <div
            key={i}
            className="cal-event cal-event-task"
            title={`${e.perigrafi_energias || ''} - ${e.pelatis || ''}`}
            onClick={(ev) => { ev.stopPropagation(); if (e.ypothesi_id) navigate(`/cases/${e.ypothesi_id}`); }}
          >
            {trunc(e.perigrafi_energias, 15) || '•'}
          </div>
        ))}
        {dayEvents.length > 3 && <div className="cal-event-more">+{dayEvents.length - 3}</div>}
      </div>
    );
  }

  const selectedEvents = selectedDate ? (byDay[selectedDate.getDate()] || []) : [];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Ημερολόγιο Λοιπών Ενεργειών">
      {error && <div className="error">{error}</div>}

      <div className="section" style={{ marginBottom: 20 }}>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Δικηγόρος</label>
            <select value={filters.dikigoros_id} onChange={e => setFilters(f => ({ ...f, dikigoros_id: e.target.value }))}>
              <option value="">— όλοι —</option>
              {lawyers.map(l => <option key={l.aa} value={l.aa}>{`${l.eponymo || ''} ${l.onoma || ''}`.trim()}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Κατάσταση</label>
            <select value={filters.ekkremis} onChange={e => setFilters(f => ({ ...f, ekkremis: e.target.value }))}>
              <option value="">— όλες —</option>
              <option value="true">Εκκρεμείς</option>
              <option value="false">Ολοκληρώθηκαν</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setMonthCursor(new Date(y, m - 1, 1))}>‹ Προηγ.</button>
          <h2 style={{ textTransform: 'capitalize', margin: 0 }}>
            {monthName} {loading && <span style={{ fontSize: 13, color: '#a0aec0' }}>(φόρτωση...)</span>}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setMonthCursor(new Date())}>Σήμερα</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setMonthCursor(new Date(y, m + 1, 1))}>Επόμ. ›</button>
          </div>
        </div>
        <div className="cal-grid">
          {['Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ','Κυρ'].map(d => <div key={d} className="cal-header">{d}</div>)}
          {cells}
        </div>
        {selectedDate && selectedEvents.length > 0 && (
          <div style={{ marginTop: 14, padding: 12, background: '#f7fafc', borderRadius: 6 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14 }}>
              Προθεσμίες στις {selectedDate.toLocaleDateString('el-GR')} ({selectedEvents.length})
            </h3>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead><tr><th>Πρωτόκολλο</th><th>Περιγραφή</th><th>Πελάτης</th><th style={{width:100}}>Κατάσταση</th></tr></thead>
              <tbody>
                {selectedEvents.map((e, i) => (
                  <tr key={i} className="clickable" onClick={() => e.ypothesi_id && navigate(`/cases/${e.ypothesi_id}`)}>
                    <td><strong>{e.xeirokinito_id || '—'}</strong></td>
                    <td>{trunc(e.perigrafi_energias, 60) || '—'}</td>
                    <td>{e.pelatis || '—'}</td>
                    <td>
                      <span className={`badge ${e.ekkremis !== false ? 'badge-open' : 'badge-closed'}`}>
                        {e.ekkremis !== false ? 'Εκκρεμής' : 'Έκλεισε'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: '#a0aec0' }}>
          Σύνολο εγγραφών: <strong>{events.length}</strong>
          <span style={{ marginLeft: 12, color: '#e53e3e' }}>
            Ληξιπρόθεσμες (κόκκινες κάρτες): {events.filter(e => {
              if (e.ekkremis === false || !e.date_dead_line) return false;
              return new Date(e.date_dead_line) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            }).length}
          </span>
        </div>
      </div>
    </Layout>
  );
}

export default TaskActionsCalendar;
