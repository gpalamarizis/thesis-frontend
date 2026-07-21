import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { reports, people, lists } from '../../api';
import { fmtDate, trunc } from '../../utils/format';
import CalendarExportButton from '../../components/CalendarExportButton';
import { eventFromCourtAction } from '../../utils/calendar';

/**
 * CourtActionsCalendar — Ημερολόγιο δικαστικών ενεργειών με φίλτρα και calendar view.
 */
function CourtActionsCalendar({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [lawyers, setLawyers] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [xeiristId, setXeiristId] = useState('');
  const [diadikasiaId, setDiadikasiaId] = useState('');
  const [ekkremis, setEkkremis] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    people.lawyers().then(d => setLawyers(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
    lists.get('diadikasies').then(d => setProcedures(Array.isArray(d) ? d : d?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const from = new Date(y, m, 1).toISOString().slice(0, 10);
    const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
    setLoading(true);
    const params = { from, to };
    if (xeiristId) params.xeiristId = xeiristId;
    if (diadikasiaId) params.diadikasiaId = diadikasiaId;
    if (ekkremis !== 'all') params.ekkremis = ekkremis;
    reports.courtActionsCalendar(params)
      .then(d => setEvents(Array.isArray(d) ? d : d?.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [monthCursor, xeiristId, diadikasiaId, ekkremis]);

  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const monthName = monthCursor.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0

  const byDay = {};
  events.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date);
    if (d.getFullYear() !== y || d.getMonth() !== m) return;
    const day = d.getDate();
    (byDay[day] = byDay[day] || []).push(e);
  });

  const today = new Date();
  const isToday = (day) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === day;

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(<div key={`empty-${i}`} className="cal-cell cal-empty" />);
  for (let day = 1; day <= lastDay.getDate(); day++) {
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
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div
              className="cal-event"
              style={{ flex: 1 }}
              title={`${e.xeirokinito_id || ''} - ${e.dikastirio_name || ''} - ${e.perigrafi || e.name || ''}`}
              onClick={(ev) => { ev.stopPropagation(); if (e.ypothesi_id) navigate(`/cases/${e.ypothesi_id}`); }}
            >
              {e.xeirokinito_id || '•'}
            </div>
            <span onClick={ev => ev.stopPropagation()}>
              <CalendarExportButton event={eventFromCourtAction(e)} filename={`dikasimos-${e.aa || e.id}.ics`} />
            </span>
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

      <div className="section" style={{ marginBottom: 20 }}>
        <div className="form-grid-3">
          <div className="form-group">
            <label>Δικηγόρος</label>
            <select value={xeiristId} onChange={e => setXeiristId(e.target.value)}>
              <option value="">— όλοι —</option>
              {lawyers.map(l => <option key={l.aa} value={l.aa}>{`${l.eponymo || ''} ${l.onoma || ''}`.trim()}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Διαδικασία</label>
            <select value={diadikasiaId} onChange={e => setDiadikasiaId(e.target.value)}>
              <option value="">— όλες —</option>
              {procedures.map(p => <option key={p.aa} value={p.aa}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Κατάσταση</label>
            <select value={ekkremis} onChange={e => setEkkremis(e.target.value)}>
              <option value="all">— όλες —</option>
              <option value="true">Εκκρεμείς</option>
              <option value="false">Έκλεισαν</option>
            </select>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="cal-header-row">
          <button className="btn btn-secondary btn-sm" onClick={() => setMonthCursor(new Date(y, m - 1, 1))}>‹ Προηγ.</button>
          <h2 style={{ margin: 0 }}>{monthName}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setMonthCursor(new Date())}>Σήμερα</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setMonthCursor(new Date(y, m + 1, 1))}>Επόμ. ›</button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Φόρτωση...</div>
        ) : (
          <div className="cal-grid">
            {['Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ','Κυρ'].map(d => <div key={d} className="cal-header">{d}</div>)}
            {cells}
          </div>
        )}

        {selectedEvents.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3>Δικάσιμοι {fmtDate(selectedDate)}</h3>
            <table className="data-table">
              <thead><tr><th>Πρωτόκολλο</th><th>Δικαστήριο</th><th>Διαδικασία</th><th>Πελάτης</th><th>Περιγραφή</th><th style={{width:60}}></th></tr></thead>
              <tbody>
                {selectedEvents.map((e, i) => (
                  <tr key={i} className="clickable" onClick={() => e.ypothesi_id && navigate(`/cases/${e.ypothesi_id}`)}>
                    <td><strong>{e.xeirokinito_id || '—'}</strong></td>
                    <td>{e.dikastirio_name || '—'}</td>
                    <td>{e.diadikasia_name || '—'}</td>
                    <td>{e.pelatis || '—'}</td>
                    <td>{trunc(e.perigrafi || e.name, 50)}</td>
                    <td onClick={ev => ev.stopPropagation()}>
                      <CalendarExportButton event={eventFromCourtAction(e)} filename={`dikasimos-${e.aa || e.id}.ics`} />
                    </td>
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
