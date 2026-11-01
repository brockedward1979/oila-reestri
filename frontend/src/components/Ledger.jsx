import { useMemo } from 'react';
import { STATS, STAT_BY_KEY, countStat } from '../lib/helpers.js';

const pct = (v, base) => (base ? Math.round((v / base) * 100) : 0);

function Row({ s, v, base, on, onPick }) {
  const p = pct(v, base);
  return (
    <button className={'lrow' + (on ? ' on' : '') + (s.tone ? ' tone-' + s.tone : '') + (v ? '' : ' zero')} aria-pressed={on} onClick={() => onPick(s.k)}
      title={`${s.label}: ${v} (${p}%). Bosing, ro‘yxat shu guruh bo‘yicha saralanadi`}>
      <span className="lr-l">{s.label}</span>
      <span className="lr-v num">{v}<small>{p}%</small></span>
      <span className="lr-bar" aria-hidden="true"><i style={{ width: `${Math.max(v ? 2 : 0, p)}%` }} /></span>
    </button>
  );
}

/** Jami ko'rsatkichlar: bir qarashda o'qiladigan ixcham panel. Har bir qator bosiladi va ro'yxatni filtrlaydi. */
export default function Ledger({ fams, statKey, onPick, selection }) {
  const t = useMemo(() => Object.fromEntries(STATS.flatMap((g) => g.items).map((s) => [s.k, countStat(s, fams)])), [fams]);
  const n = t.oila, M = t.azo;
  const groups = STATS.slice(2); // Bolalar, Bandlik, Ijtimoiy holat
  const toifa = STATS[0].items.slice(1);
  const S = STAT_BY_KEY;
  return (
    <div className="ledger">
      <header className="lg-head">
        <p className="lg-kicker">Jami ko‘rsatkichlar</p>
        <h2 className="lg-title">{selection}</h2>
      </header>

      <div className="lg-hero">
        <button className={'hero' + (!statKey ? ' on' : '')} onClick={() => onPick('oila')}><b className="num">{n}</b><span>oila</span></button>
        <button className="hero" onClick={() => onPick('oila')}><b className="num">{M}</b><span>kishi</span></button>
        <button className={'hero' + (statKey === 'u18' ? ' on' : '')} onClick={() => onPick('u18')}><b className="num">{t.u18}</b><span>18 yoshgacha</span></button>
      </div>

      <section className="lg-sec">
        <h3>Oila toifasi</h3>
        <div className="lg-stack" aria-hidden="true">
          {toifa.map((s) => t[s.k] ? <i key={s.k} className={'seg-' + s.tone} style={{ flexGrow: t[s.k] }} /> : null)}
        </div>
        {toifa.map((s) => <Row key={s.k} s={s} v={t[s.k]} base={n} on={statKey === s.k} onPick={onPick} />)}
      </section>

      <section className="lg-sec">
        <h3>Jinsi</h3>
        <div className="lg-split" aria-hidden="true">
          {t.ayol ? <i className="seg-f" style={{ flexGrow: t.ayol }} /> : null}
          {t.erkak ? <i className="seg-m" style={{ flexGrow: t.erkak }} /> : null}
        </div>
        <div className="lg-pair">
          <button className={'pair f' + (statKey === 'ayol' ? ' on' : '')} onClick={() => onPick('ayol')}><b className="num">{t.ayol}</b> ayol <small>{pct(t.ayol, M)}%</small></button>
          <button className={'pair m' + (statKey === 'erkak' ? ' on' : '')} onClick={() => onPick('erkak')}><b className="num">{t.erkak}</b> erkak <small>{pct(t.erkak, M)}%</small></button>
        </div>
      </section>

      {groups.map((g) => (
        <section key={g.group} className="lg-sec">
          <h3>{g.group}</h3>
          {g.items.map((s) => <Row key={s.k} s={s} v={t[s.k]} base={M} on={statKey === s.k} onPick={onPick} />)}
        </section>
      ))}
      <p className="lg-note">Foiz toifada oilalar sonidan, qolganida oila a’zolari sonidan olingan. Qatorni bossangiz, ro‘yxatda faqat shu guruh qoladi.</p>
    </div>
  );
}
