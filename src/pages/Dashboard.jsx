import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { reports, cases } from '../api';
import { fmtDate, toISODate } from '../utils/format';

import DueActionsPanel from '../components/DueActionsPanel';
import { _t, LOCALE } from '../i18n';
function Dashboard({ user, onLogout, onOpenCaseSearch }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_cases: 0, pending_cases: 0, hearings_next_30d: 0, open_tasks: 0, max_protocol_no: 0 });
  const [hearings, setHearings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [monthHearings, setMonthHearings] = useState([]);
  const [monthTasks, setMonthTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showProtoSearch, setShowProtoSearch] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const summary = await reports.summary().catch(() => ({}));
        if (cancelled) return;
        const raw = (summary && summary.stats) ? summary.stats : (summary || {});
        setStats({
          total_cases:       raw.total_cases       ?? 0,
          max_protocol_no:   raw.max_protocol_no   ?? 0,
          pending_cases:     raw.pending_cases     ?? 0,
          hearings_next_30d: raw.hearings_next_30d ?? 0,
          open_tasks:        raw.open_tasks        ?? 0,
        });

        const [hRes, tRes] = await Promise.allSettled([
          reports.upcomingHearings(),
          reports.pendingTasks(),
        ]);
        if (cancelled) return;
        const unwrap = (v) => Array.isArray(v) ? v : (v?.data || v?.items || []);
        if (hRes.status === 'fulfilled') setHearings(unwrap(hRes.value).slice(0, 5));
        if (tRes.status === 'fulfilled') setTasks(unwrap(tRes.value).slice(0, 5));
      } catch (e) {
        if (!cancelled) setError(e.message || _t("Σφάλμα φόρτωσης"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Δικάσιμοι ΚΑΙ λοιπές ενέργειες του ορατού μήνα.
  // Οι δύο κλήσεις είναι ανεξάρτητες: αν αποτύχει η μία, η άλλη εμφανίζεται κανονικά.
  useEffect(() => {
    let cancelled = false;
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    // Τοπική ώρα — το toISOString() γύριζε στην προηγούμενη μέρα και
    // έκοβε την τελευταία δικάσιμο κάθε μήνα.
    const from = toISODate(new Date(y, m, 1));
    const to   = toISODate(new Date(y, m + 1, 0));
    const unwrap = (d) => (Array.isArray(d) ? d : (d?.data || []));
    reports.upcomingHearings(from, to)
      .then(d => { if (!cancelled) setMonthHearings(unwrap(d)); })
      .catch(() => { if (!cancelled) setMonthHearings([]); });
    // all: και οι ολοκληρωμένες του μήνα — εμφανίζονται αχνές, όπως το
    // ημερολόγιο δείχνει και τις δικασίμους που πέρασαν.
    reports.pendingTasks({ from, to, all: true })
      .then(d => { if (!cancelled) setMonthTasks(unwrap(d)); })
      .catch(() => { if (!cancelled) setMonthTasks([]); });
    return () => { cancelled = true; };
  }, [monthCursor]);

  return (
    <Layout user={user} onLogout={onLogout} onOpenCaseSearch={onOpenCaseSearch} title={_t("Πίνακας Ελέγχου")}>
      {error && <div className="error">{error}</div>}

      <div className="section" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>{_t("Καλώς ήρθες,")} {user.first_name || user.firstName || ''}</h2>
            <p style={{ marginTop: 6, color: '#718096', fontSize: 14 }}>
              {_t("Σύνοψη γραφείου — δεδομένα σε πραγματικό χρόνο.")}
            </p>
          </div>
          <button className="btn" onClick={() => setShowProtoSearch(true)}>{_t("🔍 Αναζήτηση με αριθμό πρωτοκόλλου")}</button>
        </div>
      </div>

      {/* Οι ενέργειες που έφτασαν μπαίνουν ΠΑΝΩ από τα πάντα: αν ο
          χειριστής δει μόνο ένα πράγμα ανοίγοντας την εφαρμογή, αυτό
          πρέπει να είναι. Κρύβεται μόνη της όταν δεν υπάρχει καμία. */}
      <DueActionsPanel />

      <div className="stats">
        <StatCard label={_t("Υποθέσεις σύνολο")}        value={stats.total_cases}       to="/cases"
                  note={stats.max_protocol_no > stats.total_cases
                    ? _t("Τελ. αρ. πρωτοκόλλου …/{0}", [stats.max_protocol_no])
                    : null} />
        <StatCard label={_t("Εκκρεμείς υποθέσεις")}     value={stats.pending_cases}     to="/reports/pending" accent="open" />
        <StatCard label={_t("Δικάσιμοι (30 ημερών)")}   value={stats.hearings_next_30d} to="/reports/hearings" accent="warn" />
        <StatCard label={_t("Εκκρεμείς ενέργειες")}     value={stats.open_tasks}        to="/reports/tasks" />
      </div>

      <div className="section" style={{ marginTop: 20 }}>
        <MonthCalendar
          cursor={monthCursor}
          setCursor={setMonthCursor}
          hearings={monthHearings}
          tasks={monthTasks}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </div>

      <div className="dashboard-row" style={{ marginTop: 20 }}>
        <div className="section">
          <div className="section-header">
            <h2>{_t("Προσεχείς δικάσιμοι")}</h2>
            <Link to="/reports/hearings" className="link-inline">{_t("Όλες →")}</Link>
          </div>
          {loading && <div className="empty-state">{_t("Φόρτωση...")}</div>}
          {!loading && hearings.length === 0 && (
            <div className="empty-state">{_t("Δεν υπάρχουν προσεχείς δικάσιμοι.")}</div>
          )}
          {!loading && hearings.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>{_t("Ημ/νία")}</th>
                  <th>{_t("Πρωτόκολλο")}</th>
                  <th>{_t("Πελάτης")}</th>
                  <th>{_t("Χειριστής")}</th>
                </tr>
              </thead>
              <tbody>
                {hearings.map((h, i) => {
                  // Η γραμμή οδηγεί στην υπόθεση, ανοιχτή στις Δικαστικές
                  // ενέργειες — εκεί που ζει η δικάσιμος.
                  const to = h.ypothesi_id ? `/cases/${h.ypothesi_id}?tab=court` : null;
                  return (
                    <tr key={h.aa || h.id || i}
                        onClick={to ? () => navigate(to) : undefined}
                        style={to ? { cursor: 'pointer' } : undefined}
                        title={to ? _t("Άνοιγμα υπόθεσης") : undefined}>
                      <td>{fmtDate(h.date)}</td>
                      <td>{to
                        ? <Link to={to} className="link-inline" onClick={e => e.stopPropagation()}>
                            {h.xeirokinito_id || _t("(χωρίς πρωτόκολλο)")}
                          </Link>
                        : (h.xeirokinito_id || '—')}</td>
                      <td>{h.pelatis || '—'}</td>
                      <td>{handlerOf(h) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <div className="section-header">
            <h2>{_t("Εκκρεμείς ενέργειες")}</h2>
            <Link to="/reports/tasks" className="link-inline">{_t("Όλες →")}</Link>
          </div>
          {loading && <div className="empty-state">{_t("Φόρτωση...")}</div>}
          {!loading && tasks.length === 0 && (
            <div className="empty-state">{_t("Δεν υπάρχουν εκκρεμείς ενέργειες.")}</div>
          )}
          {!loading && tasks.length > 0 && (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>{_t("Προθεσμία")}</th>
                  <th>{_t("Ενέργεια")}</th>
                  <th>{_t("Πρωτόκολλο")}</th>
                  <th>{_t("Χειριστής")}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => {
                  // Λοιπή ενέργεια → Λοιπές ενέργειες της υπόθεσης·
                  // ενέργεια δικασίμου → Δικαστικές ενέργειες
                  const to = t.ypothesi_id ? `/cases/${t.ypothesi_id}?tab=${tabOf(t)}` : null;
                  return (
                    <tr key={`${t.kind || 'task'}:${t.aa || t.id || i}`}
                        onClick={to ? () => navigate(to) : undefined}
                        style={to ? { cursor: 'pointer' } : undefined}
                        title={to ? _t("Άνοιγμα υπόθεσης") : undefined}>
                      <td>{fmtDate(t.date_dead_line)}</td>
                      <td>
                        {t.perigrafi_energias || '—'}
                        {t.kind === 'court_sub' && (
                          <div style={{ fontSize: 12, color: '#718096' }}>
                            {_t("Δικάσιμος")} {fmtDate(t.dikasimos_date)}{t.dikastirio_name ? ` · ${t.dikastirio_name}` : ''}
                          </div>
                        )}
                      </td>
                      <td>{to
                        ? <Link to={to} className="link-inline" onClick={e => e.stopPropagation()}>
                            {t.xeirokinito_id || _t("(χωρίς πρωτόκολλο)")}
                          </Link>
                        : (t.xeirokinito_id || '—')}</td>
                      <td><HandlerCell e={t} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showProtoSearch && (
        <ProtocolSearchModal onClose={() => setShowProtoSearch(false)} />
      )}
    </Layout>
  );
}

// Χειριστής: προτεραιότητα στον δικηγόρο της ίδιας της δικασίμου, αλλιώς ο χειριστής της υπόθεσης.
// Η στήλη λέει «Χειριστής», άρα πρώτα ο χειριστής ΤΗΣ ΥΠΟΘΕΣΗΣ. Ο
// δικηγόρος της δικασίμου μόνο αν η υπόθεση δεν έχει χειριστή.
//
// Πριν ήταν ανάποδα: έδειχνε δικηγόρους που είχαν κολλήσει σε δικάσιμους
// από τη μετάπτωση, ανενεργούς και ποτέ ανατεθειμένους στην υπόθεση.
//
// ΕΝΕΡΓΕΙΕΣ (λοιπές και δικασίμων): ο δικηγόρος που καταχωρήθηκε ΣΤΗΝ
// ΕΝΕΡΓΕΙΑ — το backend τον στέλνει έτοιμο ως «xeiristis» (αίτημα Μαύρου
// 26/10). Ο χειριστής της υπόθεσης μόνο αν η ενέργεια δεν έχει δικηγόρο,
// και τότε φαίνεται αχνός.
function handlerOf(e) {
  if (e.xeiristis !== undefined) return e.xeiristis || '';
  return e.xeiristes || e.dikigoroi_energeias || '';
}
function HandlerCell({ e }) {
  const name = handlerOf(e);
  if (!name) return '—';
  if (!e.xeiristis_apo_ypothesi) return name;
  return (
    <span style={{ color: '#a0aec0' }}
          title={_t("Η ενέργεια δεν έχει δικηγόρο — εμφανίζεται ο χειριστής της υπόθεσης")}>
      {name}
    </span>
  );
}
// Καρτέλα της υπόθεσης όπου ζει η ενέργεια
function tabOf(e) {
  return e.kind === 'court_sub' ? 'court' : 'tasks';
}
// Σύντομη μορφή για το πλακίδιο του ημερολογίου: «Επώνυμο Α.»
//
// Το backend στέλνει «Επώνυμο Όνομα», χωρισμένα με κόμμα. Σκέτο το επώνυμο
// δεν αρκεί όταν στο γραφείο υπάρχουν περισσότεροι από ένας με το ίδιο,
// οπότε κρατάμε και το αρχικό του μικρού ονόματος.
function handlerShort(e) {
  const full = handlerOf(e);
  if (!full) return '';
  return full
    .split(',')
    .map(p => {
      const parts = p.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '';
      const eponymo = parts[0];
      const onoma = parts[1] || '';
      // Το αρχικό με κεφαλαίο, χωρίς τόνο (Ά -> Α), όπως γράφεται στις συντομογραφίες
      const arxiko = onoma
        ? onoma.charAt(0).toLocaleUpperCase('el-GR').normalize('NFD').replace(/[\u0300-\u036f]/g, '') + '.'
        : '';
      return arxiko ? `${eponymo} ${arxiko}` : eponymo;
    })
    .filter(Boolean)
    .join(', ');
}

// Ημερολόγιο μήνα: δικάσιμοι (μωβ) και λοιπές ενέργειες (πορτοκαλί).
// Οι δύο πηγές ενοποιούνται σε ένα σχήμα ώστε κελί, tooltip και πίνακας
// ημέρας να τις χειρίζονται με τον ίδιο κώδικα.
function toCalEvent(src, kind) {
  const isCourt = kind === 'court';
  const isSub = src.kind === 'court_sub';
  return {
    kind,
    sub: isSub,
    tab: isCourt || isSub ? 'court' : 'tasks',
    key: `${isSub ? 'sub' : kind}:${src.aa ?? src.id ?? ''}`,
    date: isCourt ? src.date : src.date_dead_line,
    xeirokinito_id: src.xeirokinito_id,
    ypothesi_id: src.ypothesi_id,
    pelatis: src.pelatis,
    handler: handlerOf(src),
    handlerShort: handlerShort(src),
    // Δικάσιμος: το δικαστήριο. Ενέργεια: η περιγραφή της.
    label: isCourt ? (src.dikastirio_name || src.perigrafi || '') : (src.perigrafi_energias || ''),
    done: !isCourt && src.ekkremis === false,
  };
}

function MonthCalendar({ cursor, setCursor, hearings, tasks = [], selectedDate, setSelectedDate }) {
  const navigate = useNavigate();
  const [showCourt, setShowCourt] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const monthName = cursor.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });

  // First day of month: 0=Sunday, we want Monday-first
  const firstDay = new Date(y, m, 1).getDay(); // 0=Sun..6=Sat
  const mondayOffset = (firstDay + 6) % 7; // days before day 1
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const events = [
    ...(showCourt ? hearings.map(h => toCalEvent(h, 'court')) : []),
    ...(showTasks ? tasks.map(t => toCalEvent(t, 'task')) : []),
  ];

  // Ανά ημέρα του μήνα. Μέσα στην ημέρα: πρώτα οι δικάσιμοι, μετά οι
  // εκκρεμείς ενέργειες, τελευταίες οι ολοκληρωμένες.
  const rank = (e) => (e.kind === 'court' ? 0 : (e.done ? 2 : 1));
  const byDay = {};
  events.forEach(e => {
    const d = e.date ? new Date(e.date) : null;
    if (!d || isNaN(d.getTime())) return;
    if (d.getMonth() !== m || d.getFullYear() !== y) return;
    const day = d.getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });
  Object.values(byDay).forEach(list => list.sort((a, b) => rank(a) - rank(b)));

  const today = new Date();
  const isToday = (day) => today.getDate() === day && today.getMonth() === m && today.getFullYear() === y;
  const openEvent = (e) => {
    if (!e.ypothesi_id) return;
    navigate(`/cases/${e.ypothesi_id}?tab=${e.tab}`);
  };
  const kindLabel = (e) => (e.kind === 'court' ? _t("Δικάσιμος")
    : `${e.sub ? _t('Ενέργεια δικασίμου') : _t('Ενέργεια')}${e.done ? ' ✓' : ''}`);

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
        {dayEvents.slice(0, 2).map(e => (
          <div
            key={e.key}
            className={`cal-event ${e.kind === 'task' ? 'cal-event-task' : ''} ${e.done ? 'cal-event-done' : ''}`}
            title={[kindLabel(e), e.xeirokinito_id, e.label, e.handler && `— ${e.handler}`]
              .filter(Boolean).join(' ')}
            onClick={(ev) => { ev.stopPropagation(); openEvent(e); }}
          >
            <span className="cal-event-proto">{e.xeirokinito_id || '•'}</span>
            {e.handlerShort && <span className="cal-event-handler">{e.handlerShort}</span>}
          </div>
        ))}
        {dayEvents.length > 2 && <div className="cal-event-more">+{dayEvents.length - 2}</div>}
      </div>
    );
  }

  const selectedEvents = selectedDate ? (byDay[selectedDate.getDate()] || []) : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date(y, m - 1, 1))}>{_t("‹ Προηγ.")}</button>
        <h2 style={{ textTransform: 'capitalize', margin: 0 }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date())}>{_t("Σήμερα")}</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCursor(new Date(y, m + 1, 1))}>{_t("Επόμ. ›")}</button>
        </div>
      </div>
      <div className="cal-legend">
        <label className="cal-legend-item">
          <input type="checkbox" checked={showCourt} onChange={e => setShowCourt(e.target.checked)} />
          <span className="cal-legend-swatch cal-legend-court" />
          {_t("Δικάσιμοι")}
        </label>
        <label className="cal-legend-item">
          <input type="checkbox" checked={showTasks} onChange={e => setShowTasks(e.target.checked)} />
          <span className="cal-legend-swatch cal-legend-task" />
          {_t("Ενέργειες")}
        </label>
      </div>
      <div className="cal-grid">
        {['Δευ','Τρι','Τετ','Πεμ','Παρ','Σαβ','Κυρ'].map(d => <div key={d} className="cal-header">{_t(d)}</div>)}
        {cells}
      </div>
      {selectedDate && selectedEvents.length > 0 && (
        <div style={{ marginTop: 14, padding: 12, background: '#f7fafc', borderRadius: 6 }}>
          <h3 style={{ marginBottom: 8, fontSize: 14 }}>
            {_t("Ενέργειες στις")} {selectedDate.toLocaleDateString('el-GR')}
          </h3>
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: 160 }}>{_t("Είδος")}</th>
                <th>{_t("Πρωτόκολλο")}</th>
                <th>{_t("Δικαστήριο / Ενέργεια")}</th>
                <th>{_t("Πελάτης")}</th>
                <th>{_t("Χειριστής")}</th>
              </tr>
            </thead>
            <tbody>
              {selectedEvents.map(e => (
                <tr key={e.key} className="clickable" onClick={() => openEvent(e)}
                    style={e.done ? { color: '#a0aec0' } : undefined}>
                  <td>
                    <span className={`cal-legend-swatch ${e.kind === 'court' ? 'cal-legend-court' : 'cal-legend-task'}`} />
                    {kindLabel(e)}
                  </td>
                  <td>{e.xeirokinito_id || '—'}</td>
                  <td>{e.label || '—'}</td>
                  <td>{e.pelatis || '—'}</td>
                  <td>{e.handler || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProtocolSearchModal({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  const search = async () => {
    setError('');
    if (!query.trim()) { setError(_t("Δώστε αριθμό πρωτοκόλλου.")); return; }
    setSearching(true);
    try {
      // Server-side search: το backend ψάχνει σε xeirokinito_id + περίληψη + όνομα πελάτη
      const params = new URLSearchParams();
      params.set('q', query.trim());
      params.set('pageSize', '100');
      const d = await cases.list(params.toString());
      const matches = Array.isArray(d) ? d : (d?.data || []);
      setResults(matches);
      if (matches.length === 1) {
        navigate(`/cases/${matches[0].aa || matches[0].id}`);
        onClose();
      } else if (matches.length === 0) {
        setError(_t("Δεν βρέθηκε υπόθεση με αυτό το πρωτόκολλο."));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Modal
      title={_t("Αναζήτηση με αριθμό πρωτοκόλλου")}
      onClose={onClose}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{_t("Ακύρωση")}</button>
        <button type="button" className="btn" disabled={searching} onClick={search}>{searching ? _t("Αναζήτηση...") : _t("Ψάξε")}</button>
      </>}
    >
      {error && <div className="error">{error}</div>}
      <div className="form-group">
        <label>{_t("Αριθμός πρωτοκόλλου (π.χ. 1Φ/2/2)")}</label>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          autoFocus
          placeholder={_t("Δώστε ολόκληρο ή μέρος του πρωτοκόλλου")}
        />
      </div>
      {results.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>{_t("Αποτελέσματα:")}</h3>
          <table className="table">
            <tbody>
              {results.map(r => (
                <tr key={r.aa || r.id} className="clickable" onClick={() => { navigate(`/cases/${r.aa || r.id}`); onClose(); }}>
                  <td><strong>{r.xeirokinito_id}</strong></td>
                  <td>{r.fysiko_full_name || r.nomiko_eponymia || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// note: μικρή επεξήγηση κάτω από τον αριθμό
function StatCard({ label, value, to, accent, note }) {
  const accentClass =
    accent === 'open' ? 'stat-card-accent-green' :
    accent === 'warn' ? 'stat-card-accent-orange' : '';
  const card = (
    <div className={`stat-card ${accentClass}`}>
      <h3>{label}</h3>
      {/* Η σημείωση στην ίδια γραμμή με τον αριθμό, ώστε η κάρτα να έχει
          το ίδιο ύψος με τις υπόλοιπες */}
      <div className="value" style={note ? { display: 'flex', alignItems: 'baseline', gap: 10 } : undefined}>
        {Number(value ?? 0).toLocaleString('el-GR')}
        {note && (
          <span style={{ fontSize: 12, fontWeight: 400, color: '#718096', whiteSpace: 'nowrap' }}
                title={_t("Ο αριθμός πρωτοκόλλου δεν ξαναδίνεται. Όταν διαγράφονται υποθέσεις, το πλήθος μένει μικρότερο από τον τελευταίο αριθμό.")}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="stat-card-link">{card}</Link> : card;
}

export default Dashboard;
