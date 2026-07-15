import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { reports, people, lists } from '../../api';
import { fmtDate, trunc } from '../../utils/format';

/**
 * CourtActionsCalendar — Ημερολόγιο δικαστικών ενεργειών με φίλτρα και calendar view.
 */
function CourtActionsCalendar({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  // Filters
  const [lawyers, setLawyers] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [filters, setFilters] = useState({
    dikigoros_id: '',
    diadikasia_id: '',
    ekkremis: '', // '', 'true', 'false'
  });

  useEffect(() => {
    people.lawyers.list()
      .then(d => setLawyers(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
    lists.get('diadikasies')
      .then(d => setProcedures(Array.isArray(d) ? d : (d?.data || [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const from = new Date(y, m, 1).toISOString().slice(0, 10);
    const to   = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    setLoading(true);
    reports.upcomingHearings(from, to)
      .then(d => {
        let list = Array.isArray(d) ? d : (d?.data || []);
        if (filters.dikigoros_id) list = list.filter(e => String(e.dikigoros_id) === filters.dikigoros_id);
        if (filters.diadikasia_id) list = list.filter(e => String(e.diadikasia_id) === filters.diadikasia_id);
        if (filters.ekkremis !== '') list = list.filter(e =>
          filters.ekkremis === 'true' ? e.ekkremis !== false : e.ekkremis === false
        );
        setEvents(list);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [monthCursor, filters]);

  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const monthName = monthCursor.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(y, m, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const byDay = {};
  events.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    if (isNaN(d.getTime()) || d.getMonth() !== m || d.getFullYear() !== y) return;
    const day = d.getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });

  const today = new Date();
  const isToday = (day) => today.getDate() === day && today.getMonth() === m && today.getFullYear() === y;

  const cells = [];
  for (let i = 0; i < mondayOffset; i++) cells.push(<div key={`e${i}`} className="cal-cell cal-empty" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = byDay[day] || [];
    const isSel = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === m && selectedDate.getFullYear() === y;
    cells.push(
      <div
        key={day}
        className={`cal-cell ${isToday(day) ? 'cal-today' : ''} ${dayEvents.length ? 'cal-has-events' : ''} ${isSel ? 'cal-selected' : ''}`}
        onClick={() => setSelectedDate(new Date(y, m, day))}
      >
        <div className="cal-day-num">{day}</div>
        {dayEvents.slice(0, 3).map((e, i) => (
          <div
            key={i}
            className="cal-event"
            title={`${e.xeirokinito_id || ''} - ${e.dikastirio_name || ''} - ${e.perigrafi || e.name || ''}`}
            onClick={(ev) => { ev.stopPropagation(); if (e.ypothesi_id) navigate(`/cases/${e.ypothesi_id}`); }}
          >
            {e.xeirokinito_id || '•'}
          </div>
        ))}
        {dayEvents.length > 3 && <div className="cal-event-more">+{dayEvents.length - 3}</div>}
      </div>
    );
  }

  const selectedEvents = selectedDate ? (byDay[selectedDate.getDate()] || []) : [];

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title="Ημερολόγιο Δικαστικών Ενεργειών">
      {error && <div className="error">{error}</div>}

      {/* Filters */}
      <div className="section" style={{ marginBottom: 20 }}>
        <div className="form-grid-3">
          <div className="form-group">
            <label>Δικηγόρος</label>
            <select value={filters.dikigoros_id} onChange={e => setFilters(f => ({ ...f, dikigoros_id: e.target.value }))}>
              <option value="">— όλοι —</option>
              {lawyers.map(l => <option key={l.aa} value={l.aa}>{`${l.eponymo || ''} ${l.onoma || ''}`.trim()}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Διαδικασία</label>
            <select value={filters.diadikasia_id} onChange={e => setFilters(f => ({ ...f, diadikasia_id: e.target.value }))}>
              <option value="">— όλες —</option>
              {procedures.map(p => <option key={p.aa} value={p.aa}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Κατάσταση</label>
            <select value={filters.ekkremis} onChange={e => setFilters(f => ({ ...f, ekkremis: e.target.value }))}>
              <option value="">— όλες —</option>
              <option value="true">Εκκρεμείς</option>
              <option value="false">Έκλεισαν</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar */}
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
              Δικάσιμοι στις {selectedDate.toLocaleDateString('el-GR')} ({selectedEvents.length})
            </h3>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead><tr><th>Πρωτόκολλο</th><th>Δικαστήριο</th><th>Διαδικασία</th><th>Πελάτης</th><th>Περιγραφή</th></tr></thead>
              <tbody>
                {selectedEvents.map((e, i) => (
                  <tr key={i} className="clickable" onClick={() => e.ypothesi_id && navigate(`/cases/${e.ypothesi_id}`)}>
                    <td><strong>{e.xeirokinito_id || '—'}</strong></td>
                    <td>{e.dikastirio_name || '—'}</td>
                    <td>{e.diadikasia_name || '—'}</td>
                    <td>{e.pelatis || '—'}</td>
                    <td>{trunc(e.perigrafi || e.name, 50)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: '#a0aec0' }}>
          Σύνολο δικασίμων μηνός: <strong>{events.length}</strong>
        </div>
      </div>
    </Layout>
  );
}

export default CourtActionsCalendar;
