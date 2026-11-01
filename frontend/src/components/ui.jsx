import { useEffect, useRef, useState } from 'react';
import { TAGS, TOIFA, initials, toISO, fromISO } from '../lib/helpers.js';

const P = {
  chev: 'M6 9l6 6 6-6', plus: 'M12 5v14M5 12h14', edit: 'M4 20h4L19 9l-4-4L4 16v4z', trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  down: 'M12 4v11m-5-5l5 5 5-5M5 20h14', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3l-5-5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  cols: 'M4 5h16M4 12h16M4 19h16M9 3v4M15 10v4M7 17v4', up: 'M6 15l6-6 6 6', x: 'M6 6l12 12M18 6L6 18',
  crown: 'M4 18h16L18 8l-4 4-2-6-2 6-4-4z', camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
};
export const Icon = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n]} /></svg>
);

export function Modal({ title, onClose, children, footer, wide }) {
  const box = useRef();
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.classList.add('lock');
    // Birinchi maydonga fokus (telefonda klaviatura o'zi ochilmasligi uchun faqat katta ekranda)
    if (window.matchMedia('(min-width: 720px)').matches) box.current?.querySelector('input:not([type=file]),select,textarea')?.focus();
    return () => { document.removeEventListener('keydown', k); document.body.classList.remove('lock'); };
  }, [onClose]);
  return (
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'sheet' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={box}>
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
          <input type="date" value={toISO(v)} onChange={(e) => set(fromISO(e.target.value))} />
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
export function Confirm({ text, action, onYes, onClose }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const yes = async () => {
    setBusy(true); setErr('');
    try { await onYes(); onClose(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title="Tasdiqlang" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Bekor qilish</button><button className="btn danger" disabled={busy} onClick={yes}>{busy ? 'Bajarilmoqda…' : action}</button></>}>
      <p>{text}</p>
      <FormError error={err} />
    </Modal>
  );
}
