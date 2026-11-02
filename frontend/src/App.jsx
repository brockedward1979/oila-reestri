import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, auth, setUnauthorizedHandler, wakeServer } from './api.js';
import {
  DEFAULT_SETTINGS, FILTER_OPT, RELATIONS, STAT_BY_KEY, TAGS, TOIFA, activeFilterKeys, applyFilters,
  describeSelection, emptyFilters, fmt, head, memberHit, norm, parseDMY,
} from './lib/helpers.js';
import { exportStandard } from './lib/exporters.js';
import { Confirm, Icon, Modal } from './components/ui.jsx';
import { FamilyForm, MemberForm } from './components/forms.jsx';
import ExportBuilder from './components/ExportBuilder.jsx';
import Settings from './components/Settings.jsx';
import FamilyItem from './components/FamilyItem.jsx';
import Login from './components/Login.jsx';
import Ledger from './components/Ledger.jsx';
import FilterPanel from './components/FilterPanel.jsx';

const EMPTY = { families: [], customFields: [], presets: [], settings: DEFAULT_SETTINGS };

export default function App() {
  const [authed, setAuthed] = useState(() => !!auth.token);
  useEffect(() => { setUnauthorizedHandler(() => setAuthed(false)); wakeServer(); }, []);
  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return <Registry onLogout={() => { auth.clear(); setAuthed(false); }} />;
}

function Registry({ onLogout }) {
  const [data, setData] = useState(EMPTY);
  const [status, setStatus] = useState('loading');
  const [loadErr, setLoadErr] = useState('');
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState(emptyFilters);
  const [fpOpen, setFpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [sort, setSort] = useState('name');
  const [statKey, setStatKey] = useState('');
  const [openId, setOpenId] = useState(null);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState('');
  const tRef = useRef();
  const listRef = useRef();
  const toast = useCallback((t) => { setMsg(t); clearTimeout(tRef.current); tRef.current = setTimeout(() => setMsg(''), 3000); }, []);

  const [slow, setSlow] = useState(false);
  const load = useCallback(async () => {
    setStatus((s) => (s === 'ready' ? 'ready' : 'loading')); setLoadErr(''); setSlow(false);
    const timer = setTimeout(() => setSlow(true), 3500);
    try {
      const b = await api.bootstrap();
      // Rasmlar keyin keladi; hozircha "undefined" — saqlashda rasmga tegilmasligi uchun
      setData({ ...b, families: b.families.map((f) => ({ ...f, rasm: f.hasRasm ? undefined : '' })) });
      setStatus('ready');
      api.photos().then((ph) => setData((d) => ({
        ...d, families: d.families.map((f) => (f.rasm === undefined && ph[f.id] ? { ...f, rasm: ph[f.id] } : f)),
      }))).catch(() => {});
    } catch (e) { setLoadErr(e.message); setStatus('error'); }
    clearTimeout(timer);
  }, []);
  useEffect(() => { load(); }, [load]);

  const fams = data.families;
  const searched = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return fams;
    return fams.filter((f) => f.azolar.some((m) => norm(m.fio).includes(nq) || (m.jshshir || '').includes(nq)) || norm(f.telefon).replace(/\s/g, '').includes(nq.replace(/\s/g, '')));
  }, [fams, q]);
  const base = useMemo(() => {
    const key = {
      name: (f) => head(f)?.fio || '', size: (f) => -f.azolar.length,
      reg: (f) => -(parseDMY(f.reyestrSana) || 0), regOld: (f) => +(parseDMY(f.reyestrSana) || 0),
    }[sort];
    return [...applyFilters(searched, flt)].sort((a, b) => { const x = key(a), y = key(b); return typeof x === 'string' ? x.localeCompare(y) : x - y; });
  }, [searched, flt, sort]);
  const stat = STAT_BY_KEY[statKey];
  const visible = useMemo(() => (!stat ? base : base.filter((f) => (stat.fam ? stat.fam(f) : f.azolar.some((m) => memberHit(stat, m))))), [base, stat]);
  const selection = describeSelection(flt, q.trim());
  const visibleMembers = visible.reduce((a, f) => a + f.azolar.length, 0);
  const activeKeys = activeFilterKeys(flt);
  const anyActive = activeKeys.length || q.trim() || statKey;

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
    setStatKey(k === statKey || k === 'oila' || k === 'azo' ? '' : k); setOpenId(null); setStatsOpen(false);
    const top = (listRef.current?.getBoundingClientRect().top || 0) + window.scrollY - 8;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  };
  const clearFilters = () => { setQ(''); setFlt(emptyFilters()); setStatKey(''); };
  const removeFilter = (k) => { const g = FILTER_OPT[k].group; setFlt((f) => ({ ...f, [g]: f[g].filter((x) => x !== k) })); };
  const toggleToifa = (k) => setFlt((f) => ({ ...f, toifa: k ? (f.toifa.includes(k) ? f.toifa.filter((x) => x !== k) : [...f.toifa, k]) : [] }));
  const ledger = <Ledger fams={base} statKey={statKey} onPick={pickStat} selection={selection} />;

  return (
    <div className={'app' + (status === 'ready' ? ' has-dock' : '')}>
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
          <button className="btn ghost" disabled={status !== 'ready'} onClick={async () => { try { await exportStandard(fams, data.settings); toast('Standart jadval yuklab olindi'); } catch { toast('Excel faylni tayyorlab bo‘lmadi'); } }}><Icon n="down" s={16} /> Standart jadval</button>
          <button className="btn ghost" disabled={status !== 'ready'} onClick={() => setModal({ t: 'export' })}><Icon n="cols" s={16} /> Jadvalni sozlash</button>
          <span className="top-icons">
            <button className="icon-btn bordered" aria-label="Sozlamalar" title="Sozlamalar" disabled={status !== 'ready'} onClick={() => setModal({ t: 'settings' })}><Icon n="gear" /></button>
            <button className="icon-btn bordered" aria-label="Chiqish" title="Chiqish" onClick={onLogout}><Icon n="out" /></button>
          </span>
        </div>
      </header>

      <div className="layout">
        <main className="main">
          <div className={"tools" + (fpOpen ? " fp-open" : "")} ref={listRef}>
            <div className="tools-row">
              <label className="search"><Icon n="search" s={16} />
                <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, JSHSHIR yoki telefon bo‘yicha qidirish" aria-label="Qidirish" />
                {q && <button className="icon-btn" aria-label="Qidiruvni tozalash" onClick={() => setQ('')}><Icon n="x" s={16} /></button>}
              </label>
              <div className="fp-wrap">
                <button className={'btn ghost fp-btn' + (activeKeys.length ? ' active' : '')} aria-expanded={fpOpen} onClick={() => setFpOpen(!fpOpen)}>
                  <Icon n="filter" s={16} /><span className="fp-btn-t">Filtr</span>
                  {activeKeys.length > 0 && <span className="badge num">{activeKeys.length}</span>}
                </button>
                {fpOpen && <FilterPanel fams={searched} flt={flt} setFlt={setFlt} sort={sort} setSort={setSort} resultCount={base.length} onClose={() => setFpOpen(false)} />}
              </div>
            </div>
            <div className="chips" role="group" aria-label="Oila toifasi">
              <button className={'fchip' + (!flt.toifa.length ? ' on' : '')} aria-pressed={!flt.toifa.length} onClick={() => toggleToifa('')}>
                Barchasi <span className="num">{fams.length}</span>
              </button>
              {Object.entries(TOIFA).map(([k, v]) => (
                <button key={k} className={'fchip t-' + k + (flt.toifa.includes(k) ? ' on' : '')} aria-pressed={flt.toifa.includes(k)} onClick={() => toggleToifa(k)}>
                  {flt.toifa.includes(k) && <span aria-hidden="true">✓</span>}{v.short} <span className="num">{fams.filter((f) => f.toifa === k).length}</span>
                </button>
              ))}
            </div>
            <div className={'selbar' + (anyActive ? ' active' : '')} aria-live="polite">
              <span className="sel-count"><b className="num">{visible.length}</b> oila, <b className="num">{visibleMembers}</b> kishi</span>
              {!anyActive && <span className="sel-all">Barcha oilalar ko‘rsatilmoqda</span>}
              {q.trim() && <button className="selchip" onClick={() => setQ('')}>“{q.trim()}” <Icon n="x" s={12} /></button>}
              {activeKeys.map((k) => (
                <button key={k} className={'selchip' + (FILTER_OPT[k].tone ? ' tone-' + FILTER_OPT[k].tone : '')} onClick={() => removeFilter(k)} aria-label={`${FILTER_OPT[k].label} filtrini olib tashlash`}>
                  {FILTER_OPT[k].label}{FILTER_OPT[k].hint ? ` (${FILTER_OPT[k].hint})` : ''} <Icon n="x" s={12} />
                </button>
              ))}
              {stat && <button className="selchip stat" onClick={() => setStatKey('')} aria-label="Ko‘rsatkich filtrini olib tashlash">{stat.label} <Icon n="x" s={12} /></button>}
              {anyActive && <button className="sel-clear" onClick={clearFilters}>Hammasini tozalash</button>}
            </div>
          </div>

          {status === 'loading' && slow && (
            <div className="wake" role="status">
              <span className="wake-dot" aria-hidden="true" />
              <div><b>Server uyg‘onmoqda…</b><p className="muted">Bepul serverda uzoq vaqt kirilmasa, birinchi ochilish 30–60 soniya oladi. Sahifani yopmang.</p></div>
            </div>
          )}
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
          </>)}
        </main>
        {status === 'ready' && <aside className="side" aria-label="Jami ko‘rsatkichlar">{ledger}</aside>}
      </div>

      {status === 'ready' && (
        <div className="dock">
          <div className="dock-t">
            <b><span className="num">{visible.length}</span> oila, <span className="num">{visibleMembers}</span> kishi</b>
            <span>{describeSelection(flt, q.trim(), statKey)}</span>
          </div>
          <button className="btn" onClick={() => setStatsOpen(true)}><Icon n="chart" s={16} /> Ko‘rsatkichlar</button>
        </div>
      )}
      {statsOpen && <Modal title="Jami ko‘rsatkichlar" onClose={() => setStatsOpen(false)} className="stats-sheet">{ledger}</Modal>}

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
      {modal?.t === 'export' && <ExportBuilder data={data} setData={setData} visible={visible} statKey={statKey} selection={describeSelection(flt, q.trim(), statKey)} onClose={() => setModal(null)} toast={toast} />}
      {modal?.t === 'settings' && <Settings data={data} setData={setData} reload={load} onClose={() => setModal(null)} toast={toast} />}
      <div className={'toast' + (msg ? ' show' : '')} role="status" aria-live="polite">{msg}</div>
    </div>
  );
}
