import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, auth, setUnauthorizedHandler } from './api.js';
import {
  DEFAULT_SETTINGS, RELATIONS, STATS, STAT_BY_KEY, TAGS, TOIFA, countStat, fmt, head, memberHit, norm, parseDMY,
} from './lib/helpers.js';
import { exportStandard } from './lib/exporters.js';
import { Confirm, Icon } from './components/ui.jsx';
import { FamilyForm, MemberForm } from './components/forms.jsx';
import ExportBuilder from './components/ExportBuilder.jsx';
import Settings from './components/Settings.jsx';
import FamilyItem from './components/FamilyItem.jsx';
import Login from './components/Login.jsx';

const EMPTY = { families: [], customFields: [], presets: [], settings: DEFAULT_SETTINGS };

export default function App() {
  const [authed, setAuthed] = useState(() => !!auth.token);
  useEffect(() => setUnauthorizedHandler(() => setAuthed(false)), []);
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return <Registry onLogout={() => { auth.clear(); setAuthed(false); }} />;
}

function Registry({ onLogout }) {
  const [data, setData] = useState(EMPTY);
  const [status, setStatus] = useState('loading');
  const [loadErr, setLoadErr] = useState('');
  const [q, setQ] = useState('');
  const [toifa, setToifa] = useState('');
  const [sort, setSort] = useState('name');
  const [statKey, setStatKey] = useState('');
  const [openId, setOpenId] = useState(null);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState('');
  const tRef = useRef();
  const listRef = useRef();
  const toast = useCallback((t) => { setMsg(t); clearTimeout(tRef.current); tRef.current = setTimeout(() => setMsg(''), 3000); }, []);

  const load = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? 'ready' : 'loading')); setLoadErr('');
    try {
      const [families, customFields, presets, settings] = await Promise.all([api.families(), api.customFields(), api.presets(), api.settings()]);
      setData({ families, customFields, presets, settings }); setStatus('ready');
    } catch (e) { setLoadErr(e.message); setStatus('error'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fams = data.families;
  const base = useMemo(() => {
    const nq = norm(q.trim());
    let list = fams.filter((f) => !toifa || f.toifa === toifa);
    if (nq) list = list.filter((f) => f.azolar.some((m) => norm(m.fio).includes(nq) || (m.jshshir || '').includes(nq)) || norm(f.telefon).replace(/\s/g, '').includes(nq.replace(/\s/g, '')));
    const key = { name: (f) => head(f)?.fio || '', size: (f) => -f.azolar.length, reg: (f) => -(parseDMY(f.reyestrSana) || 0) }[sort];
    return [...list].sort((a, b) => { const x = key(a), y = key(b); return typeof x === 'string' ? x.localeCompare(y) : x - y; });
  }, [fams, q, toifa, sort]);
  const stat = STAT_BY_KEY[statKey];
  const visible = useMemo(() => (!stat ? base : base.filter((f) => (stat.fam ? stat.fam(f) : f.azolar.some((m) => memberHit(stat, m))))), [base, stat]);
  const totals = useMemo(() => Object.fromEntries(STATS.flatMap((g) => g.items).map((s) => [s.k, countStat(s, base)])), [base]);

  const allJsh = useMemo(() => { const mp = new Map(); fams.forEach((f) => f.azolar.forEach((m) => m.jshshir && mp.set(m.jshshir, m))); return mp; }, [fams]);
  const extraTags = useMemo(() => [...new Set(fams.flatMap((f) => f.azolar.flatMap((m) => m.holat || [])))].filter((t) => !TAGS.includes(t)), [fams]);
  const schools = useMemo(() => [...new Set(fams.flatMap((f) => f.azolar.map((m) => m.oquvJoyi).filter(Boolean)))], [fams]);
  const ctx = { allJsh, extraTags, customFields: data.customFields };

  const putFamily = (f) => setData((d) => ({ ...d, families: d.families.map((x) => (x.id === f.id ? f : x)) }));
  const patchFamily = (fid, fn) => setData((d) => ({ ...d, families: d.families.map((x) => (x.id === fid ? fn(x) : x)) }));
  const ops = (f) => ({
    addMember: () => setModal({ t: 'member', fid: f.id, isNew: true, m: {} }),
    editMember: (m) => setModal({ t: 'member', fid: f.id, m }),
    removeMember: (m) => setModal({
      t: 'confirm', text: `${m.fio} oila tarkibidan o‘chiriladi.`, action: 'A’zoni o‘chirish',
      yes: async () => { await api.deleteMember(m.id); patchFamily(f.id, (x) => ({ ...x, azolar: x.azolar.filter((y) => y.id !== m.id) })); toast('A’zo o‘chirildi'); },
    }),
    makeHead: (m) => setModal({
      t: 'confirm', text: `${m.fio} oila boshlig‘i (arizachi) qilib belgilanadi. Avvalgi boshliqning qarindoshligi “Boshqa” bo‘ladi, keyin uni tahrirlab qo‘ying.`, action: 'Boshliq qilish',
      yes: async () => { putFamily(await api.makeHead(m.id)); toast('Oila boshlig‘i almashtirildi'); },
    }),
    editFamily: () => setModal({ t: 'family', f }),
    removeFamily: () => setModal({
      t: 'confirm', text: `${head(f)?.fio || 'Bu'} oilasi va uning ${f.azolar.length} nafar a’zosi bazadan butunlay o‘chiriladi.`, action: 'Oilani o‘chirish',
      yes: async () => { await api.deleteFamily(f.id); setData((d) => ({ ...d, families: d.families.filter((x) => x.id !== f.id) })); setOpenId(null); toast('Oila o‘chirildi'); },
    }),
  });

  const newFamily = () => setModal({
    t: 'family', isNew: true,
    f: { mahalla: data.settings.defaultMahalla, toifa: 'kambagal', telefon: '', manzil: '', hujjatRaqami: '', reyestrSana: fmt(new Date()), savolnomaId: '', daromad: 0, izoh: '', rasm: '', extra: {} },
  });
  const pickStat = (k) => {
    setStatKey(k === statKey || k === 'oila' || k === 'azo' ? '' : k); setOpenId(null);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const clearFilters = () => { setQ(''); setToifa(''); setStatKey(''); };

  return (
    <div className="app">
      <datalist id="rel-list">{RELATIONS.map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="school-list">{schools.map((r) => <option key={r} value={r} />)}</datalist>
      <header className="top">
        <div className="brand">
          <p className="mfy">{data.settings.defaultMahalla}</p>
          <h1>Oila reestri</h1>
          <p className="muted">{status === 'ready' ? <><span className="num">{fams.length}</span> oila, <span className="num">{fams.reduce((a, f) => a + f.azolar.length, 0)}</span> kishi</> : 'Yuklanmoqda…'}</p>
        </div>
        <div className="top-act">
          <button className="btn" disabled={status !== 'ready'} onClick={newFamily}><Icon n="plus" s={16} /> Oila qo‘shish</button>
          <button className="btn ghost" disabled={status !== 'ready'} onClick={() => { exportStandard(fams, data.settings); toast('Standart jadval yuklab olindi'); }}><Icon n="down" s={16} /> Standart jadval</button>
          <button className="btn ghost" disabled={status !== 'ready'} onClick={() => setModal({ t: 'export' })}><Icon n="cols" s={16} /> Jadvalni sozlash</button>
          <span className="top-icons">
            <button className="icon-btn bordered" aria-label="Sozlamalar" title="Sozlamalar" disabled={status !== 'ready'} onClick={() => setModal({ t: 'settings' })}><Icon n="gear" /></button>
            <button className="icon-btn bordered" aria-label="Chiqish" title="Chiqish" onClick={onLogout}><Icon n="out" /></button>
          </span>
        </div>
      </header>

      <div className="tools" ref={listRef}>
        <label className="search"><Icon n="search" s={16} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, JSHSHIR yoki telefon bo‘yicha qidirish" aria-label="Qidirish" />
          {q && <button className="icon-btn" aria-label="Qidiruvni tozalash" onClick={() => setQ('')}><Icon n="x" s={16} /></button>}
        </label>
        <div className="filters">
          <div className="chips" role="group" aria-label="Toifa">
            {[['', 'Barchasi'], ...Object.entries(TOIFA).map(([k, v]) => [k, v.short])].map(([k, l]) => (
              <button key={k} className={'fchip' + (k ? ' t-' + k : '') + (toifa === k ? ' on' : '')} aria-pressed={toifa === k} onClick={() => setToifa(k)}>
                {l} <span className="num">{k ? fams.filter((f) => f.toifa === k).length : fams.length}</span>
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Saralash" title="Saralash">
            <option value="name">A–Z</option><option value="size">Ko‘p a’zoli</option><option value="reg">Yangi kirgan</option>
          </select>
        </div>
        {stat && (
          <div className="active-stat">
            <span>Ko‘rsatilmoqda: <b>{stat.label}</b>, {visible.length} oila</span>
            <button className="btn ghost sm" onClick={() => setStatKey('')}><Icon n="x" s={14} /> Filtrni olib tashlash</button>
          </div>
        )}
      </div>

      {status === 'loading' && <ul className="fams" aria-busy="true" aria-label="Yuklanmoqda">{Array.from({ length: 6 }, (_, i) => <li key={i} className="fam skel" />)}</ul>}
      {status === 'error' && (
        <div className="empty">
          <p><b>Ma’lumotlarni yuklab bo‘lmadi.</b></p><p className="muted">{loadErr}</p>
          <p className="muted">Bepul serverda birinchi so‘rov 30–60 soniya olishi mumkin.</p>
          <button className="btn" onClick={load}><Icon n="refresh" s={16} /> Qayta urinish</button>
        </div>
      )}
      {status === 'ready' && (<>
        <div className="thead" aria-hidden="true">
          <span className="c-no">№</span><span /><span className="c-name">Oila boshlig‘i</span><span className="c-toifa">Toifa</span>
          <span className="c-n">A’zolar</span><span className="c-k">Bolalar</span><span className="c-tel">Telefon</span><span className="c-reg">Reyestrga kirgan</span><span />
        </div>
        {visible.length ? (
          <ul className={'fams' + (stat?.mem ? ' with-hits' : '')}>
            {visible.map((f, i) => (
              <FamilyItem key={f.id} f={f} idx={i} open={openId === f.id} onToggle={() => setOpenId(openId === f.id ? null : f.id)}
                stat={stat} ops={ops(f)} customFields={data.customFields} toast={toast} />
            ))}
          </ul>
        ) : (
          <div className="empty">
            {fams.length ? <><p>Bu shartlarga mos oila topilmadi.</p><button className="btn ghost" onClick={clearFilters}>Barcha oilalarni ko‘rsatish</button></>
              : <><p>Reestr hozircha bo‘sh.</p><p className="muted">Oila qo‘shing yoki Sozlamalar orqali zaxira fayldan ma’lumot yuklang.</p><button className="btn" onClick={newFamily}><Icon n="plus" s={16} /> Oila qo‘shish</button></>}
          </div>
        )}

        <section className="ledger" aria-labelledby="ledger-h">
          <div className="ledger-top">
            <h2 id="ledger-h">Jami ko‘rsatkichlar</h2>
            <p className="muted">{q || toifa ? 'Qidiruv va toifa filtri bo‘yicha hisoblangan.' : 'Barcha oilalar bo‘yicha.'} Raqamni bossangiz, ro‘yxatda faqat shu guruhga tegishli oilalar qoladi.</p>
          </div>
          <div className="lg-grid">
            {STATS.map((g, gi) => (
              <div key={g.group} className={'lg lg-' + gi}>
                <h3>{g.group}</h3>
                <div className="lg-items">
                  {g.items.map((s) => (
                    <button key={s.k} className={'stat' + (s.tone ? ' tone-' + s.tone : '') + (statKey === s.k ? ' on' : '')} aria-pressed={statKey === s.k} onClick={() => pickStat(s.k)}>
                      <span className="sv num">{totals[s.k]}</span><span className="sl">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </>)}

      {modal?.t === 'family' && (
        <FamilyForm initial={modal.f} isNew={modal.isNew} ctx={ctx} onClose={() => setModal(null)}
          onSave={async (f) => {
            if (modal.isNew) {
              const created = await api.createFamily(f);
              setData((d) => ({ ...d, families: [created, ...d.families] })); setOpenId(created.id); clearFilters(); toast('Oila qo‘shildi');
            } else { putFamily(await api.updateFamily(f.id, f)); toast('Oila ma’lumotlari saqlandi'); }
            setModal(null);
          }} />
      )}
      {modal?.t === 'member' && (
        <MemberForm initial={modal.m} isNew={modal.isNew} ctx={ctx} onClose={() => setModal(null)}
          onSave={async (m) => {
            const saved = modal.isNew ? await api.addMember(modal.fid, m) : await api.updateMember(m.id, m);
            patchFamily(modal.fid, (f) => ({ ...f, azolar: modal.isNew ? [...f.azolar, saved] : f.azolar.map((x) => (x.id === saved.id ? saved : x)) }));
            toast(modal.isNew ? 'A’zo qo‘shildi' : 'O‘zgarishlar saqlandi'); setModal(null);
          }} />
      )}
      {modal?.t === 'confirm' && <Confirm text={modal.text} action={modal.action} onYes={modal.yes} onClose={() => setModal(null)} />}
      {modal?.t === 'export' && <ExportBuilder data={data} setData={setData} visible={visible} statKey={statKey} onClose={() => setModal(null)} toast={toast} />}
      {modal?.t === 'settings' && <Settings data={data} setData={setData} reload={load} onClose={() => setModal(null)} toast={toast} />}
      <div className={'toast' + (msg ? ' show' : '')} role="status" aria-live="polite">{msg}</div>
    </div>
  );
}
