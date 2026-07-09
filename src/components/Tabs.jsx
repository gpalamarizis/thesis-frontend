import { useState } from 'react';

function Tabs({ tabs, initial = 0, onChange }) {
  const [active, setActive] = useState(initial);

  const switchTo = (idx) => {
    setActive(idx);
    if (onChange) onChange(idx);
  };

  return (
    <div className="tabs">
      <div className="tabs-nav">
        {tabs.map((t, i) => (
          <button
            key={i}
            type="button"
            className={`tab-btn ${active === i ? 'active' : ''}`}
            onClick={() => switchTo(i)}
          >
            {t.label}
            {t.badge != null && <span className="tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs[active] && tabs[active].content}
      </div>
    </div>
  );
}

export default Tabs;
