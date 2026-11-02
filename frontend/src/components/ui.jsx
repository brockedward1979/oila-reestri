import { useEffect, useRef, useState } from 'react';
import { TAGS, TOIFA, fmt, initials, parseDMY } from '../lib/helpers.js';

const P = {
  chev: 'M6 9l6 6 6-6', plus: 'M12 5v14M5 12h14', edit: 'M4 20h4L19 9l-4-4L4 16v4z', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  down: 'M12 4v11m-5-5l5 5 5-5M5 20h14', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3l-5-5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  cols: 'M4 5h16M4 12h16M4 19h16M9 3v4M15 10v4M7 17v4', up: 'M6 15l6-6 6 6', x: 'M6 6l12 12M18 6L6 18',
  crown: 'M4 18h16L18 8l-4 4-2-6-2 6-4-4z', camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', filter: 'M4 5h16l-6 7v6l-4 2v-8z', chart: 'M5 20V10M12 20V4M19 20v-7',
  left: 'M15 6l-6 6 6 6',
  dots: 'M5 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM19 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z', phone: 'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z',
  home: 'M3 11l9-8 9 8M5 9.5V20h5v-6h4v6h5V9.5', users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M16 3.5a4 4 0 0 1 0 7.5M22 21c0-3-1.8-5-4.5-5.7',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z', brief: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z', menu: 'M4 7h16M4 12h16M4 17h16', table: 'M4 5h16v14H4zM4 10h16M10 10v9', right: 'M9 6l6 6-6 6', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
};
export const Icon = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);

/* Ochiq modallar to'plami: Escape faqat eng ustidagisini yopadi. */
const modalStack = [];

export function Modal({ title, onClose, children, footer, wide, className = '' }) {
  const box = useRef();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const id = {};
    modalStack.push(id);
    const k = (e) => { if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) { e.stopPropagation(); closeRef.current(); } };
    document.addEventListener('keydown', k);
    document.body.classList.add('lock');
    // Telefonda klaviatura o'zi ochilib ketmasligi uchun fokus faqat katta ekranda
    if (window.matchMedia('(min-width: 720px)').matches) box.current?.querySelector('input:not([type=file]):not([type=checkbox]):not([type=radio]),select,textarea')?.focus();
    return () => {
      document.removeEventListener('keydown', k);
      modalStack.splice(modalStack.indexOf(id), 1);
      if (!modalStack.length) document.body.classList.remove('lock');
    };
  }, []);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'sheet' + (wide ? ' wide' : '') + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={title} ref={box}>
        <header className="sheet-h"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Yopish"><Icon n="x" /></button></header>
        <div className="sheet-b">{children}</div>
        {footer && <footer className="sheet-f">{footer}</footer>}
      </div>
    </div>
  );
}

export const Field = ({ label, hint, children, full, warn }) => (
  <label className={'fld' + (full ? ' full' : '')}>
    <span className="fld-l">{label}</span>{children}{hint && <span className={'fld-h' + (warn ? ' warn' : '')}>{hint}</span>}
  </label>
);

export const Avatar = ({ src, name, big }) => (src
  ? <img className={'av' + (big ? ' big' : '')} src={src} alt="" loading="lazy" />
  : <span className={'av ini' + (big ? ' big' : '')} aria-hidden="true">{initials(name)}</span>);

export const Toifa = ({ t }) => <span className={'chip t-' + t}>{TOIFA[t]?.short || '—'}</span>;

export const FormError = ({ error }) => (error ? <p className="form-err" role="alert">{error}</p> : null);

export function TagPicker({ value, onChange, extra }) {
  const [txt, setTxt] = useState('');
  const all = [...new Set([...TAGS, ...extra, ...value])];
  const toggle = (t) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const add = () => { if (txt.trim()) { onChange([...value, txt.trim()]); setTxt(''); } };
  return (
    <div className="tags">
      {all.map((t) => (
        <button type="button" key={t} className={'tag' + (value.includes(t) ? ' on' : '')} aria-pressed={value.includes(t)} onClick={() => toggle(t)}>{t}</button>
      ))}
      <span className="tag-add">
        <input value={txt} placeholder="Boshqa holat…" aria-label="Boshqa holat qo‘shish" onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} onBlur={add} />
      </span>
    </div>
  );
}

export function CustomInputs({ fields, scope, value, onChange }) {
  return fields.filter((f) => f.scope === scope).map((cf) => {
    const v = value?.[cf.id] ?? '';
    const set = (nv) => onChange({ ...(value || {}), [cf.id]: nv });
    return (
      <Field key={cf.id} label={cf.label}>
        {cf.type === 'select' ? (
          <select value={v} onChange={(e) => set(e.target.value)}><option value="">—</option>{cf.options.map((o) => <option key={o}>{o}</option>)}</select>
        ) : cf.type === 'date' ? (
          <DateInput value={v} onChange={set} />
        ) : (
          <input type={cf.type === 'number' ? 'number' : 'text'} value={v} onChange={(e) => set(e.target.value)} />
        )}
      </Field>
    );
  });
}

export function resizeImage(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const W = 240, H = 312, c = document.createElement('canvas'); c.width = W; c.height = H;
        const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
        c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = rej; img.src = r.result;
    };
    r.onerror = rej; r.readAsDataURL(file);
  });
}

/** onYes Promise qaytarsa, tugma "bajarilmoqda" holatida turadi; xato bo'lsa oynada ko'rsatiladi. */
export function Confirm({ text, action, onYes, onClose, title = 'Tasdiqlang', danger = true }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const yes = async () => {
    setBusy(true); setErr('');
    try { await onYes(); onClose(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose} className="confirm"
      footer={<><button className="btn ghost" onClick={onClose}>Bekor qilish</button><button className={'btn' + (danger ? ' danger' : '')} disabled={busy} onClick={yes}>{busy ? 'Bajarilmoqda…' : action}</button></>}>
      <div className="confirm-body">
        <span className={'confirm-ic' + (danger ? ' d' : '')} aria-hidden="true">{danger ? '!' : '?'}</span>
        <p>{text}</p>
      </div>
      <FormError error={err} />
    </Modal>
  );
}

/** Matn so'raydigan chiroyli oyna (brauzerning prompt() o'rniga). */
export function Prompt({ title, label, initial = '', action = 'Saqlash', onSubmit, onClose }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e?.preventDefault();
    if (!v.trim()) return;
    setBusy(true); setErr('');
    try { await onSubmit(v.trim()); onClose(); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose} className="confirm"
      footer={<><button className="btn ghost" onClick={onClose}>Bekor qilish</button><button className="btn" type="submit" form="prompt-form" disabled={busy || !v.trim()}>{busy ? 'Saqlanmoqda…' : action}</button></>}>
      <form id="prompt-form" onSubmit={submit} className="grid one">
        <Field label={label}><input value={v} onChange={(e) => setV(e.target.value)} /></Field>
      </form>
      <FormError error={err} />
    </Modal>
  );
}

/* ───────────── Sana: doim dd.mm.yyyy ───────────── */
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const WEEK = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const maskDate = (raw) => { const d = raw.replace(/\D/g, '').slice(0, 8); return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('.'); };

export function DateInput({ value, onChange }) {
  const [txt, setTxt] = useState(value || '');
  const [open, setOpen] = useState(false);
  const wrap = useRef();
  useEffect(() => { setTxt(value || ''); }, [value]);
  const bad = txt && (txt.length < 10 || !parseDMY(txt));
  return (
    <div className="date-in" ref={wrap}>
      <input inputMode="numeric" placeholder="dd.mm.yyyy" value={txt} className={bad ? 'warn' : ''} maxLength={10}
        onChange={(e) => {
          const t = maskDate(e.target.value);
          setTxt(t);
          if (!t) onChange('');
          else if (t.length === 10 && parseDMY(t)) onChange(t);
        }}
        onBlur={() => { if (bad) setTxt(value || ''); }} />
      <button type="button" className="icon-btn" aria-label="Taqvimni ochish" aria-expanded={open} onClick={() => setOpen(!open)}><Icon n="cal" s={17} /></button>
      {open && <Calendar anchor={wrap} value={parseDMY(value)} onPick={(d) => { onChange(d ? fmt(d) : ''); setOpen(false); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

function Calendar({ anchor, value, onPick, onClose }) {
  const start = value || new Date();
  const [y, setY] = useState(start.getFullYear());
  const [m, setM] = useState(start.getMonth());
  const [pos, setPos] = useState(null);
  const box = useRef();
  useEffect(() => {
    const r = anchor.current.getBoundingClientRect();
    const W = 296, H = 340;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    const top = r.bottom + H + 8 < window.innerHeight ? r.bottom + 4 : Math.max(8, r.top - H - 4);
    setPos({ left, top });
    const out = (e) => { if (!box.current?.contains(e.target) && !anchor.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    const scroll = (e) => { if (!box.current?.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc, true);
    window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc, true); window.removeEventListener('scroll', scroll, true); };
  }, []);
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const same = (d, dd) => d && d.getFullYear() === y && d.getMonth() === m && d.getDate() === dd;
  const shift = (k) => { const d = new Date(y, m + k, 1); setY(d.getFullYear()); setM(d.getMonth()); };
  const thisYear = new Date().getFullYear();
  if (!pos) return null;
  return (
    <div className="cal" ref={box} style={{ left: pos.left, top: pos.top }} role="dialog" aria-label="Taqvim">
      <div className="cal-h">
        <button type="button" className="icon-btn" aria-label="Oldingi oy" onClick={() => shift(-1)}><Icon n="left" s={16} /></button>
        <select value={m} onChange={(e) => setM(+e.target.value)} aria-label="Oy">{MONTHS.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
        <select value={y} onChange={(e) => setY(+e.target.value)} aria-label="Yil">
          {Array.from({ length: thisYear - 1919 + 1 }, (_, i) => thisYear + 1 - i).map((v) => <option key={v}>{v}</option>)}
        </select>
        <button type="button" className="icon-btn" aria-label="Keyingi oy" onClick={() => shift(1)}><Icon n="right" s={16} /></button>
      </div>
      <div className="cal-g">
        {WEEK.map((w) => <span key={w} className="cal-w">{w}</span>)}
        {cells.map((d, i) => (d ? (
          <button type="button" key={i} className={'cal-d' + (same(value, d) ? ' on' : '') + (same(new Date(), d) ? ' today' : '')} onClick={() => onPick(new Date(y, m, d, 12))}>{d}</button>
        ) : <span key={i} />))}
      </div>
      <div className="cal-f">
        <button type="button" className="btn ghost sm" onClick={() => onPick(new Date())}>Bugun</button>
        <button type="button" className="btn ghost sm" onClick={() => onPick(null)}>Tozalash</button>
      </div>
    </div>
  );
}
