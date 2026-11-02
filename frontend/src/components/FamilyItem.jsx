import { useEffect, useRef, useState } from 'react';
import { TOIFA, duration, famSummary, fmt, head, info, memberHit, sortedMembers } from '../lib/helpers.js';
import { famDOCX, famDocHTML, famPDF, famXLSX } from '../lib/exporters.js';
import { Avatar, Icon, Toifa } from './ui.jsx';

/* ───────── kichik yordamchi: "⋯" menyusi ───────── */
function MoreMenu({ items, label = 'Boshqa amallar', light }) {
  const [open, setOpen] = useState(false);
  const box = useRef();
  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span className="more" ref={box}>
      <button className={'more-btn' + (light ? ' light' : '')} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}><Icon n="dots" s={18} /></button>
      {open && (
        <span className="more-menu" role="menu">
          {items.filter(Boolean).map((it) => (
            <button key={it.label} role="menuitem" className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.run(); }}>
              <Icon n={it.icon} s={16} />{it.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/* ───────── oila a'zosi qatori ───────── */
function MemberRow({ m, f, hit, actions }) {
  const i = info(m);
  const isHead = m.qarindoshlik === 'Arizachi';
  const place = m.oquvJoyi ? `${m.oquvJoyi}${m.sinf ? `, ${m.sinf}` : ''}` : m.ishJoyi;
  return (
    <li className={'mem' + (hit ? ' hit' : '') + (isHead ? ' is-head' : '')}>
      <span className={'mem-av ' + (i.jins === 'Ayol' ? 'f' : i.jins === 'Erkak' ? 'm' : '')}>
        <Avatar src={isHead ? f.rasm : null} name={m.fio} />
      </span>
      <div className="mem-who">
        <span className="mem-name">{m.fio}</span>
        <span className="mem-rel">{isHead ? 'Oila boshlig‘i' : m.qarindoshlik || 'Qarindoshlik ko‘rsatilmagan'}</span>
      </div>
      <div className="mem-age">
        <b>{i.age != null ? `${i.age} yosh` : '—'}</b>
        <span>{[i.jins, fmt(i.dob)].filter(Boolean).join(', ')}</span>
      </div>
      <div className="mem-id"><span className="lbl-m">JSHSHIR</span><b className="num">{m.jshshir || '—'}</b></div>
      <div className="mem-tags">
        {(m.holat || []).map((t) => <span key={t} className="tg">{t}</span>)}
        {m.nogironlik && <span className="tg ng">Nogironlik: {m.nogironlik}</span>}
        {place && <span className="tg place">{place}</span>}
        {!(m.holat || []).length && !m.nogironlik && !place && <span className="tg none">Holat kiritilmagan</span>}
      </div>
      <div className="mem-act">
        <button className="icon-btn" aria-label="Tahrirlash" title="Tahrirlash" onClick={actions.edit}><Icon n="edit" s={17} /></button>
        <MoreMenu label={`${m.fio}: boshqa amallar`} items={[
          !isHead && { icon: 'crown', label: 'Oila boshlig‘i qilish', run: actions.makeHead },
          { icon: 'trash', label: 'A’zoni o‘chirish', run: actions.remove, danger: true },
        ]} />
      </div>
    </li>
  );
}

/* ───────── hujjatni oldindan ko'rish ───────── */
function DocPreview({ html }) {
  const wrap = useRef(); const inner = useRef();
  const [k, setK] = useState(1); const [hgt, setH] = useState(0); const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const fit = () => { const w = wrap.current?.clientWidth || 1; const s = zoom ? 1 : Math.min(1, w / 1060); setK(s); setH((inner.current?.scrollHeight || 0) * s); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(wrap.current); return () => ro.disconnect();
  }, [html, zoom]);
  return (
    <>
      <div className={'docwrap' + (zoom ? ' zoomed' : '')} ref={wrap} style={{ height: zoom ? undefined : hgt || undefined }}>
        <div ref={inner} className="docscale" style={{ transform: `scale(${k})` }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {k < 0.95 || zoom ? <button className="btn soft sm zoom-b" onClick={() => setZoom(!zoom)}>{zoom ? 'Ekranga sig‘dirish' : 'Asl o‘lchamda ko‘rish'}</button> : null}
    </>
  );
}

function DocTab({ f, customFields, toast }) {
  const [busy, setBusy] = useState('');
  const run = async (kind, fn) => {
    setBusy(kind);
    try { await fn(f, customFields); toast(`${kind} fayl yuklab olindi`); } catch (e) { console.error(e); toast(`${kind} faylni tayyorlab bo‘lmadi`); }
    setBusy('');
  };
  return (
    <div className="doc-tab">
      <div className="doc-dl">
        <p>Oila ma’lumotnomasini kerakli formatda yuklab oling:</p>
        <div className="row-gap">
          <button className="btn sm fmt-pdf" disabled={!!busy} onClick={() => run('PDF', famPDF)}><Icon n="down" s={16} /> {busy === 'PDF' ? 'Tayyorlanmoqda…' : 'PDF'}</button>
          <button className="btn sm fmt-doc" disabled={!!busy} onClick={() => run('Word', famDOCX)}><Icon n="down" s={16} /> {busy === 'Word' ? 'Tayyorlanmoqda…' : 'Word'}</button>
          <button className="btn sm fmt-xls" disabled={!!busy} onClick={() => run('Excel', famXLSX)}><Icon n="down" s={16} /> {busy === 'Excel' ? 'Tayyorlanmoqda…' : 'Excel'}</button>
        </div>
      </div>
      <DocPreview html={famDocHTML(f, customFields)} />
    </div>
  );
}

/* ───────── "Ma'lumotlar" yorlig'i: guruhlangan nom–qiymat ro'yxati ───────── */
function KV({ rows }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v ? '' : 'none'}>{v || 'kiritilmagan'}</dd></div>)}
    </dl>
  );
}
function InfoTab({ f, customFields }) {
  const extra = customFields.filter((c) => c.scope === 'oila').map((c) => [c.label, f.extra?.[c.id]]);
  return (
    <div className="info-grid">
      <section className="info-card ic-sky"><h4><Icon n="home" s={16} /> Aloqa va manzil</h4>
        <KV rows={[['Telefon', f.telefon], ['Manzil', f.manzil], ['Mahalla', f.mahalla]]} />
      </section>
      <section className="info-card ic-sun"><h4><Icon n="doc" s={16} /> Reyestr</h4>
        <KV rows={[['Toifa', TOIFA[f.toifa]?.label], ['Hujjat raqami', f.hujjatRaqami], ['Savolnoma ID', f.savolnomaId], ['Kirgan sana', f.reyestrSana], ['Turgan muddati', duration(f.reyestrSana)]]} />
      </section>
      <section className="info-card ic-mint"><h4><Icon n="brief" s={16} /> Daromad{extra.length ? ' va qo‘shimcha' : ''}</h4>
        <KV rows={[['Oylik daromad', `${Number(f.daromad || 0).toLocaleString('ru-RU')} so‘m`], ...extra]} />
      </section>
      {f.izoh && <section className="info-card ic-lav wide"><h4>Izoh</h4><p>{f.izoh}</p></section>}
    </div>
  );
}

/* ───────── oila qatori ───────── */
export default function FamilyItem({ f, idx, open, onToggle, stat, ops, customFields, toast }) {
  const h = head(f);
  const hits = stat?.mem ? f.azolar.filter((m) => memberHit(stat, m)).length : 0;
  const isKid = (m) => m.qarindoshlik !== 'Arizachi' && info(m).age != null && info(m).age < 18;
  const kids = f.azolar.filter(isKid).length;
  const [tab, setTab] = useState('tarkib');
  useEffect(() => { if (!open) setTab('tarkib'); }, [open]);
  const sorted = sortedMembers(f);
  const groups = [
    { k: 'adult', t: 'Kattalar', list: sorted.filter((m) => !isKid(m)) },
    { k: 'kid', t: 'Bolalar (18 yoshgacha)', list: sorted.filter(isKid) },
  ].filter((g) => g.list.length);
  const summary = famSummary(f);
  const tones = ['lav', 'pink', 'sun', 'sky', 'mint', 'peach'];
  return (
    <li className={'fam' + (open ? ' open' : '')}>
      <button className="fam-row" aria-expanded={open} onClick={onToggle}>
        <span className="c-no num">{idx + 1}</span>
        <Avatar src={f.rasm} name={h?.fio} />
        <span className="c-name">
          <span className="fam-name">{h?.fio || 'Oila boshlig‘i yo‘q'}</span>
          <span className="fam-sub num">{h?.jshshir || 'JSHSHIR kiritilmagan'}</span>
          <span className="m-meta">
            <Toifa t={f.toifa} />
            <span className="pill"><Icon n="users" s={13} /> {f.azolar.length} kishi</span>
            {kids > 0 && <span className="pill"><Icon n="star" s={13} /> {kids} bola</span>}
            {hits > 0 && <span className="pill hit">{hits} ta mos</span>}
          </span>
        </span>
        <span className="c-toifa"><Toifa t={f.toifa} /></span>
        <span className="c-n"><span className="pill num">{f.azolar.length}</span></span>
        <span className="c-k"><span className="pill num">{kids}</span></span>
        <span className="c-tel num">{f.telefon || <span className="muted">—</span>}</span>
        <span className="c-reg num">{f.reyestrSana || <span className="muted">—</span>}</span>
        {stat?.mem ? <span className="c-hit">{hits} ta mos</span> : null}
        <span className="c-chev" aria-hidden="true"><Icon n="chev" s={18} /></span>
      </button>

      {open && (
        <div className="fam-panel">
          <div className="fp-bar">
            <div className="fp-facts">
              <span className="fact"><Icon n="phone" s={15} />{f.telefon ? <a href={`tel:${f.telefon.replace(/\s/g, '')}`}>{f.telefon}</a> : 'Telefon yo‘q'}</span>
              <span className="fact"><Icon n="cal" s={15} />{f.reyestrSana ? `Reyestrda ${duration(f.reyestrSana)} (${f.reyestrSana} dan)` : 'Reyestr sanasi yo‘q'}</span>
              {f.manzil && <span className="fact"><Icon n="home" s={15} />{f.manzil}</span>}
            </div>
            <div className="fp-actions">
              <button className="btn sm on-dark" onClick={ops.addMember}><Icon n="plus" s={16} /> A’zo qo‘shish</button>
              <button className="btn sm ghost-dark" onClick={ops.editFamily}><Icon n="edit" s={16} /> Tahrirlash</button>
              <MoreMenu light label="Oila bo‘yicha boshqa amallar" items={[
                { icon: 'doc', label: 'Ma’lumotnoma (PDF, Word, Excel)', run: () => setTab('doc') },
                { icon: 'trash', label: 'Oilani o‘chirish', run: ops.removeFamily, danger: true },
              ]} />
            </div>
          </div>

          <div className="fp-stats">
            {summary.map((x, i) => (
              <div key={x.l} className={'fstat t-' + tones[i]}><b className="num">{x.v}</b><span>{x.l}</span></div>
            ))}
          </div>

          <div className="tabs" role="tablist" aria-label="Oila ma’lumotlari bo‘limlari">
            {[['tarkib', `Oila tarkibi`, f.azolar.length], ['info', 'Ma’lumotlar'], ['doc', 'Ma’lumotnoma']].map(([k, l, n]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
                {l}{n != null && <span className="tab-n num">{n}</span>}
              </button>
            ))}
          </div>

          <div className="tab-body" role="tabpanel">
            {tab === 'tarkib' && (
              <>
                <div className="mem-head" aria-hidden="true"><span /><span>F.I.Sh. va holati</span><span>Yoshi</span><span>JSHSHIR</span><span /></div>
                {groups.map((g) => (
                  <section key={g.k} className={'mg mg-' + g.k}>
                    <h4 className="mg-t">{g.t} <span className="num">{g.list.length}</span></h4>
                    <ul className="mems">
                      {g.list.map((m) => (
                        <MemberRow key={m.id} m={m} f={f} hit={memberHit(stat, m)} actions={{ edit: () => ops.editMember(m), remove: () => ops.removeMember(m), makeHead: () => ops.makeHead(m) }} />
                      ))}
                    </ul>
                  </section>
                ))}
                <button className="add-row" onClick={ops.addMember}><Icon n="plus" s={16} /> Oilaga yangi a’zo qo‘shish</button>
              </>
            )}
            {tab === 'info' && <InfoTab f={f} customFields={customFields} />}
            {tab === 'doc' && <DocTab f={f} customFields={customFields} toast={toast} />}
          </div>
        </div>
      )}
    </li>
  );
}
