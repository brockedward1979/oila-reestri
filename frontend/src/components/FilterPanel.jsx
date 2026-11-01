import { useEffect, useRef } from 'react';
import { FILTER_GROUPS, applyFilters, emptyFilters } from '../lib/helpers.js';
import { Icon } from './ui.jsx';

export const SORTS = [
  { k: 'name', label: 'Alifbo bo‘yicha (A–Z)' },
  { k: 'size', label: 'Ko‘p a’zoli oilalar oldin' },
  { k: 'reg', label: 'Reyestrga yangi kirganlar oldin' },
  { k: 'regOld', label: 'Reyestrda uzoq turganlar oldin' },
];

/** Kompyuterda tugma tagida ochiladigan panel, telefonda pastdan chiqadigan oyna. */
export default function FilterPanel({ fams, flt, setFlt, sort, setSort, resultCount, onClose }) {
  const panel = useRef();
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    panel.current?.focus();
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  const toggle = (g, k) => setFlt((f) => ({ ...f, [g]: f[g].includes(k) ? f[g].filter((x) => x !== k) : [...f[g], k] }));
  const any = FILTER_GROUPS.some((g) => flt[g.k].length);
  return (
    <>
      <div className="fp-ov" onMouseDown={onClose} />
      <div className="fp" role="dialog" aria-label="Filtr va saralash" tabIndex={-1} ref={panel}>
        <header className="fp-h">
          <b>Filtr va saralash</b>
          <button className="icon-btn" aria-label="Yopish" onClick={onClose}><Icon n="x" /></button>
        </header>
        <div className="fp-b">
          <section className="fp-g">
            <h4>Saralash</h4>
            <div className="fp-sort">
              {SORTS.map((s) => (
                <label key={s.k} className={'fp-radio' + (sort === s.k ? ' on' : '')}>
                  <input type="radio" name="sort" checked={sort === s.k} onChange={() => setSort(s.k)} />{s.label}
                </label>
              ))}
            </div>
          </section>
          {FILTER_GROUPS.map((g) => {
            const pool = applyFilters(fams, flt, g.k);
            return (
              <section key={g.k} className="fp-g">
                <h4>{g.title}{flt[g.k].length > 1 && <span className="fp-or"> (biri bo‘lsa yetarli)</span>}</h4>
                {g.opts.map((o) => {
                  const n = pool.filter(o.test).length;
                  const on = flt[g.k].includes(o.k);
                  return (
                    <label key={o.k} className={'fp-opt' + (on ? ' on' : '') + (!n && !on ? ' dim' : '') + (o.tone ? ' tone-' + o.tone : '')}>
                      <input type="checkbox" checked={on} onChange={() => toggle(g.k, o.k)} />
                      <span className="fp-l">{o.label}{o.hint && <small>{o.hint}</small>}</span>
                      <span className="fp-n num">{n}</span>
                    </label>
                  );
                })}
              </section>
            );
          })}
        </div>
        <footer className="fp-f">
          <button className="btn ghost" disabled={!any} onClick={() => setFlt(emptyFilters())}>Tozalash</button>
          <button className="btn" onClick={onClose}>{resultCount} ta oilani ko‘rsatish</button>
        </footer>
      </div>
    </>
  );
}
