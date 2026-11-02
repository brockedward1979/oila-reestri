import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, auth, setUnauthorizedHandler, wakeServer } from './api.js';
import {
  DEFAULT_SETTINGS, FILTER_OPT, RELATIONS, STAT_BY_KEY, TAGS, TOIFA, activeFilterKeys, applyFilters,
  countStat, describeSelection, emptyFilters, fmt, head, memberHit, norm, parseDMY,
} from './lib/helpers.js';
import { getTheme, setTheme } from './lib/theme.js';
import { exportStandard, runCustomExport, runCustomPDF } from './lib/exporters.js';
import { Confirm, Icon, Modal } from './components/ui.jsx';
// Kamdan-kam ochiladigan oynalar alohida faylga ajratiladi: birinchi yuklanish yengillashadi
const FamilyForm = lazy(() => import('./components/forms.jsx').then((m) => ({ default: m.FamilyForm })));
const MemberForm = lazy(() => import('./components/forms.jsx').then((m) => ({ default: m.MemberForm })));
const ExportBuilder = lazy(() => import('./components/ExportBuilder.jsx'));
const Settings = lazy(() => import('./components/Settings.jsx'));
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
  const [quickOpen, setQuickOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navActive, setNavActive] = useState('home');
  const [theme, setThemeState] = useState(getTheme);
  const toggleTheme = () => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); setThemeState(t); };
  const sideRef = useRef();
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
    const r = listRef.current?.getBoundingClientRect();
    if (r && (r.top < 0 || r.top > window.innerHeight * 0.6)) window.scrollTo({ top: r.top + window.scrollY - 8, behavior: 'smooth' });
  };
  const stdExport = async () => {
    try { await exportStandard(fams, data.settings); toast('Standart jadval yuklab olindi'); } catch { toast('Excel faylni tayyorlab bo‘lmadi'); }
  };
  const clearFilters = () => { setQ(''); setFlt(emptyFilters()); setStatKey(''); };
  const removeFilter = (k) => { const g = FILTER_OPT[k].group; setFlt((f) => ({ ...f, [g]: f[g].filter((x) => x !== k) })); };
  const toggleToifa = (k) => setFlt((f) => ({ ...f, toifa: k ? (f.toifa.includes(k) ? f.toifa.filter((x) => x !== k) : [...f.toifa, k]) : [] }));
  const ledger = <Ledger fams={base} statKey={statKey} onPick={pickStat} selection={selection} />;

  const user = auth.user || 'Foydalanuvchi';
  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Xayrli tong' : hour < 17 ? 'Xayrli kun' : 'Xayrli kech';
  const goList = () => { const top = (listRef.current?.getBoundingClientRect().top || 0) + window.scrollY - 8; window.scrollTo({ top, behavior: 'smooth' }); };
  const navItems = [
    { k: 'home', icon: 'home', label: 'Bosh sahifa', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { k: 'list', icon: 'users', label: 'Oilalar', run: goList },
    { k: 'stats', icon: 'chart', label: 'Ko‘rsatkichlar', run: () => (window.matchMedia('(min-width: 1180px)').matches ? sideRef.current?.scrollTo({ top: 0, behavior: 'smooth' }) : setStatsOpen(true)) },
    { k: 'export', icon: 'table', label: 'Jadvallar', run: () => setModal({ t: 'export' }) },
    { k: 'settings', icon: 'gear', label: 'Sozlamalar', run: () => setModal({ t: 'settings' }) },
  ];
  const quickExport = async (kind) => {
    setQuickOpen(false);
    const cfg = data.presets[0] || { name: 'Oilalar ro‘yxati', mode: 'oila', titleCase: true, cols: ['no', 'mahalla', 'boshliq', 'boshliqJsh', 'telefon', 'toifa', 'azoSoni', 'u18Soni'] };
    const sel = describeSelection(flt, q.trim(), statKey);
    try {
      const fn = kind === 'pdf' ? runCustomPDF : runCustomExport;
      const n = await fn({
        families: visible, cfg: { ...cfg, name: sel === 'Barcha oilalar' ? cfg.name : `${cfg.name}: ${sel}`.slice(0, 120) }, cols: cfg.cols,
        customFields: data.customFields, subtitle: `${sel}. ${visible.length} oila. Tayyorlangan sana: ${fmt(new Date())}`,
      });
      toast(`${n} ta oila ${kind === 'pdf' ? 'PDF' : 'Excel'} faylga yuklandi`);
    } catch (e) { toast('Faylni tayyorlab bo‘lmadi'); }
  };
  const kpi = useMemo(() => {
    const c = (k) => countStat(STAT_BY_KEY[k], base);
    return [
      { k: 'oila', tone: 'lav', icon: 'home', label: 'Oilalar', v: c('oila'), sub: `${c('kambagal')} kambag‘al, ${c('chegara')} chegarada, ${c('davlat')} ta’minotda` },
      { k: 'azo', tone: 'pink', icon: 'users', label: 'Oila a’zolari', v: c('azo'), sub: `${c('ayol')} ayol, ${c('erkak')} erkak` },
      { k: 'u18', tone: 'sun', icon: 'star', label: '18 yoshgacha bolalar', v: c('u18'), sub: `${c('maktab')} nafari maktab o‘quvchisi` },
      { k: 'ishsiz', tone: 'sky', icon: 'brief', label: 'Ishsizlar', v: c('ishsiz'), sub: `${c('band')} kishi ish bilan band` },
    ];
  }, [base]);

  return (
    <div className={'shell' + (status === 'ready' ? ' has-dock' : '')}>
      <datalist id="rel-list">{RELATIONS.map((r) => <option key={r} value={r} />)}</datalist>
      <datalist id="school-list">{schools.map((r) => <option key={r} value={r} />)}</datalist>

      <nav className="nav" aria-label="Asosiy menyu"><div className="nav-in">
        <div className="nav-me">
          <span className="nav-av" aria-hidden="true">{user.slice(0, 1).toUpperCase()}</span>
          <b>Salom, {user}!</b>
          <span>{data.settings.defaultMahalla}</span>
        </div>
        <ul className="nav-list">
          {navItems.map((it) => (
            <li key={it.k}><button className={'nav-i' + (navActive === it.k ? ' on' : '')} onClick={() => { setNavActive(it.k); it.run(); }} title={it.label}>
              <Icon n={it.icon} s={20} /><span>{it.label}</span>
            </button></li>
          ))}
        </ul>
        <div className="nav-promo">
          <span className="nav-promo-ic" aria-hidden="true"><Icon n="table" s={22} /></span>
          <b>Standart jadval</b>
          <span>Boshqarma shablonidagi Excel</span>
          <button className="btn sm" disabled={status !== 'ready'} onClick={stdExport}><Icon n="down" s={15} /> Yuklab olish</button>
        </div>
        <button className="nav-out" onClick={onLogout}><Icon n="out" s={18} /><span>Chiqish</span></button>
      </div></nav>

      <div className="content">
        <header className="topbar">
          <div className="tb-title">
            <span className="tb-av" aria-hidden="true">{user.slice(0, 1).toUpperCase()}</span>
            <h1>Oila reestri</h1>
          </div>
          <label className="search"><Icon n="search" s={17} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, JSHSHIR yoki telefon bo‘yicha qidirish" aria-label="Qidirish" />
            {q && <button className="icon-btn" aria-label="Qidiruvni tozalash" onClick={() => setQ('')}><Icon n="x" s={16} /></button>}
          </label>
          <button className="round-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'} title={theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}>
            <Icon n={theme === 'dark' ? 'sun' : 'moon'} s={19} />
          </button>
          <button className="round-btn tb-menu" onClick={() => setMenuOpen(true)} aria-label="Menyu"><Icon n="menu" s={19} /></button>
        </header>

        <div className="layout">
          <main className="main">
            <section className="hero">
              <div className="hero-t">
                <h2>{greet}, {user}!</h2>
                <p>{status === 'ready' ? <>Reestrda <b>{fams.length}</b> oila va <b>{fams.reduce((a, f) => a + f.azolar.length, 0)}</b> kishi bor.</> : 'Ma’lumotlar yuklanmoqda…'}</p>
                <div className="hero-act">
                  <button className="btn" disabled={status !== 'ready'} onClick={newFamily}><Icon n="plus" s={16} /> Oila qo‘shish</button>
                  <button className="btn soft" disabled={status !== 'ready'} onClick={stdExport}><Icon n="down" s={16} /> Standart jadval</button>
                </div>
              </div>
              <HeroArt />
            </section>

            {status === 'ready' && (
              <section className="kpis" aria-label="Asosiy ko‘rsatkichlar">
                {kpi.map((k) => (
                  <button key={k.k} className={'kpi kpi-' + k.tone + (statKey === k.k ? ' on' : '')} onClick={() => pickStat(k.k)} aria-pressed={statKey === k.k}>
                    <span className="kpi-ic" aria-hidden="true"><Icon n={k.icon} s={20} /></span>
                    <span className="kpi-l">{k.label}</span>
                    <b className="kpi-v num">{k.v}</b>
                    <span className="kpi-s">{k.sub}</span>
                  </button>
                ))}
              </section>
            )}

            <div className={'tools' + (fpOpen || quickOpen ? ' fp-open' : '')} ref={listRef}>
              <div className="tools-row">
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
                <div className="fp-wrap">
                  <button className={'btn soft fp-btn' + (activeKeys.length ? ' active' : '')} aria-expanded={fpOpen} onClick={() => setFpOpen(!fpOpen)}>
                    <Icon n="filter" s={16} /><span className="fp-btn-t">Filtr</span>
                    {activeKeys.length > 0 && <span className="badge num">{activeKeys.length}</span>}
                  </button>
                  {fpOpen && <FilterPanel fams={searched} flt={flt} setFlt={setFlt} sort={sort} setSort={setSort} resultCount={base.length} onClose={() => setFpOpen(false)} />}
                </div>
                <div className="fp-wrap">
                  <button className="btn soft fp-btn" aria-expanded={quickOpen} disabled={status !== 'ready'} onClick={() => setQuickOpen(!quickOpen)}>
                    <Icon n="down" s={16} /><span className="fp-btn-t">Yuklab olish</span>
                  </button>
                  {quickOpen && (
                    <>
                      <div className="fp-ov" onMouseDown={() => setQuickOpen(false)} />
                      <div className="menu" role="menu">
                        <p className="menu-h">Ekrandagi {visible.length} ta oila</p>
                        <button role="menuitem" onClick={() => quickExport('xlsx')}><span className="mi mi-x">X</span><span><b>Excel</b><small>Formatlangan jadval</small></span></button>
                        <button role="menuitem" onClick={() => quickExport('pdf')}><span className="mi mi-p">P</span><span><b>PDF</b><small>Chop etishga tayyor</small></span></button>
                        <button role="menuitem" onClick={() => { setQuickOpen(false); setModal({ t: 'export' }); }}><span className="mi"><Icon n="cols" s={16} /></span><span><b>Ustunlarni tanlash…</b><small>Shablon bo‘yicha sozlash</small></span></button>
                      </div>
                    </>
                  )}
                </div>
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
            {status === 'ready' && (<div className="tcard">
              <div className="tcard-h">
                <h2>Oilalar ro‘yxati</h2>
                <span className="muted"><b className="num">{visible.length}</b> oila</span>
              </div>
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
                  {fams.length ? <><p>Bu shartlarga mos oila topilmadi.</p><button className="btn soft" onClick={clearFilters}>Barcha oilalarni ko‘rsatish</button></>
                    : <><p>Reestr hozircha bo‘sh.</p><p className="muted">Oila qo‘shing yoki Sozlamalar orqali zaxira fayldan ma’lumot yuklang.</p><button className="btn" onClick={newFamily}><Icon n="plus" s={16} /> Oila qo‘shish</button></>}
                </div>
              )}
            </div>)}
          </main>
          {status === 'ready' && <aside className="side" ref={sideRef} aria-label="Jami ko‘rsatkichlar">{ledger}</aside>}
        </div>
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
      {menuOpen && (
        <Modal title="Menyu" onClose={() => setMenuOpen(false)} className="menu-sheet">
          <div className="nav-me in-sheet">
            <span className="nav-av" aria-hidden="true">{user.slice(0, 1).toUpperCase()}</span>
            <b>Salom, {user}!</b><span>{data.settings.defaultMahalla}</span>
          </div>
          <ul className="nav-list in-sheet">
            {navItems.map((it) => (
              <li key={it.k}><button className="nav-i" onClick={() => { setMenuOpen(false); setNavActive(it.k); it.run(); }}><Icon n={it.icon} s={20} /><span>{it.label}</span></button></li>
            ))}
            <li><button className="nav-i" onClick={toggleTheme}><Icon n={theme === 'dark' ? 'sun' : 'moon'} s={20} /><span>{theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}</span></button></li>
            <li><button className="nav-i" onClick={onLogout}><Icon n="out" s={20} /><span>Chiqish</span></button></li>
          </ul>
        </Modal>
      )}

      <Suspense fallback={null}>
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
      </Suspense>
      <div className={'toast' + (msg ? ' show' : '')} role="status" aria-live="polite">{msg}</div>
    </div>
  );
}

/** Banner uchun sodda bezak: uy, yurak va yulduzchalar (tashqi rasm yuklanmaydi). */
function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 220 170" aria-hidden="true">
      <defs>
        <linearGradient id="roof" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#B7A8FF" /><stop offset="1" stopColor="#8E7BEF" /></linearGradient>
        <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#FFF8F1" /><stop offset="1" stopColor="#F5E6FF" /></linearGradient>
      </defs>
      <ellipse cx="112" cy="156" rx="88" ry="10" fill="#7C6BE0" opacity=".15" />
      <rect x="52" y="74" width="120" height="80" rx="16" fill="url(#wall)" />
      <path d="M38 84 L112 26 L186 84 Q190 90 182 92 L42 92 Q34 90 38 84Z" fill="url(#roof)" />
      <rect x="98" y="108" width="30" height="46" rx="10" fill="#C9B8FF" />
      <rect x="66" y="104" width="22" height="22" rx="7" fill="#FFE3A8" />
      <rect x="138" y="104" width="22" height="22" rx="7" fill="#FFE3A8" />
      <path d="M112 62c-5-8-17-4-14 5 2 5 14 12 14 12s12-7 14-12c3-9-9-13-14-5z" fill="#FF8FA3" />
      <path d="M190 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFC94D" />
      <path d="M26 46l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#9FD8B4" />
      <circle cx="200" cy="120" r="5" fill="#FFB8C6" /><circle cx="22" cy="128" r="4" fill="#B9D3FF" />
    </svg>
  );
}
