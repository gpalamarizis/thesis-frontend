import { useState, useEffect, useRef } from 'react';
import { downloadICS, googleCalendarUrl, outlookCalendarUrl } from '../utils/calendar';

/**
 * CalendarExportButton — dropdown με 3 επιλογές (Google, Outlook Web, .ics).
 *
 * Props:
 *   event: object with { title, start, end?, description?, location?, uid?, allDay? }
 *   filename?: default filename for .ics download
 *   size?: 'sm' | 'md' (default 'sm')
 *   label?: button text (default '📅 Ημερολόγιο')
 */
function CalendarExportButton({ event, filename, size = 'sm', label = '📅' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!event) return null;

  const stop = (e) => { e.stopPropagation(); };

  const openGoogle = (e) => {
    stop(e);
    window.open(googleCalendarUrl(event), '_blank', 'noopener');
    setOpen(false);
  };
  const openOutlook = (e) => {
    stop(e);
    window.open(outlookCalendarUrl(event), '_blank', 'noopener');
    setOpen(false);
  };
  const doDownload = (e) => {
    stop(e);
    downloadICS(event, filename);
    setOpen(false);
  };

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={stop}>
      <button
        type="button"
        className={`btn btn-${size} btn-secondary`}
        title="Προσθήκη σε ημερολόγιο"
        onClick={(e) => { stop(e); setOpen(o => !o); }}
      >
        {label}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'white',
            border: '1px solid #cbd5e0',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
            minWidth: 180,
          }}
        >
          <button type="button" className="cal-export-item" onClick={openGoogle}>
            <span style={{ marginRight: 6 }}>🗓️</span> Google Calendar
          </button>
          <button type="button" className="cal-export-item" onClick={openOutlook}>
            <span style={{ marginRight: 6 }}>📆</span> Outlook Web
          </button>
          <button type="button" className="cal-export-item" onClick={doDownload}>
            <span style={{ marginRight: 6 }}>💾</span> Λήψη .ics
          </button>
        </div>
      )}
    </span>
  );
}

export default CalendarExportButton;
