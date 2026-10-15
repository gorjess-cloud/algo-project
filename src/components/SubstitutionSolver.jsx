import { useMemo, useState } from 'react';
import * as math from 'mathjs';
import './SubstitutionSolver.css';
import SubstitutionQuiz from './SubstitutionQuiz';
import {
  term, fmtNum, fmtUp, norm, classify, parseRec, fStr,
  buildResult, simulate, trend, fmtCompact, fmtN, niceMax,
} from '../utils/substitutionLogic';

const PRESETS = [
  { name: 'Merge sort', eq: '2T(n/2) + n', guess: 'O(n log n)' },
  { name: 'Insertion sort', eq: 'T(n-1) + n', guess: 'O(n^2)' },
  { name: 'Tree traversal', eq: '2T(n/2) + 1', guess: 'O(n)' },
  { name: 'Binary search', eq: 'T(n/2) + 1', guess: 'O(log n)' },
  { name: 'Karatsuba', eq: '3T(n/2) + n', guess: 'O(n^2)' },
  { name: 'Guess too small', eq: '2T(n/2) + n', guess: 'O(n)' },
];

const VERDICT = {
  tight: ['ok', 'Proof holds · tight'],
  loose: ['warn', 'Proof holds · not tight'],
  invalid: ['bad', 'Guess too small'],
  open: ['', 'Needs a finer hypothesis'],
};

/* Chart of T(n) / g(n). A flat line means the guess is tight. */
function Chart({ pts }) {
  const W = 640, H = 250, L = 50, R = 64, T = 14, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const top = niceMax(Math.max(...pts.map((p) => p.ratio)) * 1.05 || 1);
  const x = (i) => L + (pts.length > 1 ? (iw * i) / (pts.length - 1) : iw / 2);
  const y = (v) => T + ih - (ih * v) / top;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ratio of T(n) to g(n) as n doubles">
      {[0, 1, 2, 3, 4].map((t) => {
        const v = (top * t) / 4;
        return (
          <g key={t}>
            <line className="ch-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text className="ch-t" x={L - 8} y={y(v) + 4} textAnchor="end">{fmtCompact(v)}</text>
          </g>
        );
      })}
      {pts.map((p, i) =>
        i % 2 === 0 || pts.length <= 7 ? (
          <text key={i} className="ch-t" x={x(i)} y={H - 12} textAnchor="middle">{fmtN(p.n)}</text>
        ) : null
      )}
      <polyline className="ch-line" points={pts.map((p, i) => `${x(i).toFixed(1)},${y(p.ratio).toFixed(1)}`).join(' ')} />
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} className="ch-dot" cx={x(i)} cy={y(p.ratio)} r="3" />
      ))}
      <circle className="ch-end" cx={x(pts.length - 1)} cy={y(last.ratio)} r="5" />
      <text className="ch-val" x={x(pts.length - 1) + 10} y={y(last.ratio) + 4}>{fmtCompact(last.ratio)}</text>
    </svg>
  );
}

/**
 * Substitution-method workbench.
 *
 * Props
 *   onAsk (optional): function(questionText). When given, an "Ask AI about this proof"
 *   button appears. Wire it to the chat panel so the proof is sent as a question.
 */
export default function SubstitutionSolver({ onAsk }) {
  const [rec, setRec] = useState('2T(n/2) + n');
  const [guess, setGuess] = useState('O(n log n)');
  const [cin, setCin] = useState('');
  const [syntaxMsg, setSyntaxMsg] = useState(null);

  const out = useMemo(() => {
    const pr = parseRec(rec);
    if (!pr.ok) return { error: ['Cannot read the recurrence', pr.msg] };
    const g = classify(guess);
    if (!g) return { error: ['Cannot read the guess', 'Write it like O(n log n), O(n^2), O(n), O(log n) or O(1).'] };
    let cUser = cin.trim() === '' ? null : parseFloat(cin);
    if (cUser !== null && !(cUser > 0)) cUser = null;
    return { pr, g, res: buildResult(pr.rec, g, cUser), pts: simulate(pr.rec, g) };
  }, [rec, guess, cin]);

  const { res, pts } = out;
  const v = res ? VERDICT[res.verdict] : null;
  const tr = pts && pts.length >= 3 ? trend(pts) : null;
  const lastPt = pts && pts[pts.length - 1];
  const normRec = norm(rec), normGuess = norm(guess);

  const readAs = out.pr
    ? `${out.pr.rec.type === 'divide' ? `a = ${out.pr.rec.a}, b = ${out.pr.rec.b}` : `a = ${out.pr.rec.a}, s = ${out.pr.rec.s}`}, f(n) = ${fStr(out.pr.rec.f)} with guess ${term(out.g.k, out.g.l)}`
    : '';

  const checkSyntax = () => {
    const pr = parseRec(rec);
    if (!pr.ok) return setSyntaxMsg({ bad: true, text: pr.msg });
    let ast = '';
    try {
      const expr = rec.replace(/^\s*T\(n\)\s*=/, '').replace(/−/g, '-').replace(/T\([^()]*\)/g, 'x');
      ast = ` AST: ${math.parse(expr).toString()}`;
    } catch { /* the proof builder has its own parser, so a mathjs miss is fine */ }
    return setSyntaxMsg({ bad: false, text: `Valid recurrence.${ast}` });
  };

  const ask = () => {
    const steps = res.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.why}${s.lines.length ? '\n   ' + s.lines.join('\n   ') : ''}`).join('\n');
    onAsk(`Explain this substitution-method proof step by step.\nRecurrence: ${res.recText}\nClaim: ${res.claim}\nResult: ${v[1]}\n${steps}`);
  };

  return (
    <div className="subst">
      <header className="head">
        <p className="eyebrow">Substitution method</p>
        <h2>Prove a bound by induction</h2>
        <p className="prose">Pick an example or type your own recurrence and guess. The workbench builds the proof and finds the constants.</p>
      </header>

      <div className="bench">
        <form className="card form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <h3 className="card-title">Your recurrence</h3>
          <div>
            <p className="hint" style={{ marginBottom: 8 }}>Start from an example</p>
            <div className="presets">
              {PRESETS.map((p) => (
                <button key={p.name} type="button" className="preset"
                  aria-pressed={norm(p.eq) === normRec && norm(p.guess) === normGuess}
                  onClick={() => { setRec(p.eq); setGuess(p.guess); setSyntaxMsg(null); }}>
                  <b>{p.name}</b>
                  <code>{p.eq} → {p.guess}</code>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="subst-rec">Recurrence</label>
            <div className="inp"><span className="pre">T(n) =</span>
              <input id="subst-rec" type="text" value={rec} spellCheck="false" autoCapitalize="off"
                onChange={(e) => { setRec(e.target.value); setSyntaxMsg(null); }} /></div>
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="subst-guess">Guessed bound</label>
              <div className="inp"><span className="pre">T(n) ∈</span>
                <input id="subst-guess" type="text" value={guess} spellCheck="false" autoCapitalize="off"
                  onChange={(e) => setGuess(e.target.value)} /></div>
            </div>
            <div className="field">
              <label htmlFor="subst-c">Your c<span className="opt">optional</span></label>
              <div className="inp"><span className="pre">c =</span>
                <input id="subst-c" type="text" inputMode="decimal" placeholder="auto" spellCheck="false"
                  value={cin} onChange={(e) => setCin(e.target.value)} /></div>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={checkSyntax}>Check syntax</button>
          </div>
          <p className={`status ${syntaxMsg ? (syntaxMsg.bad ? 'bad' : 'ok') : out.pr ? 'ok' : ''}`} aria-live="polite">
            {syntaxMsg ? syntaxMsg.text : out.pr ? `Read as ${readAs}.` : ''}
          </p>
          <p className="hint">Forms read: aT(n/b) + f(n) and aT(n−s) + f(n). f(n) can be 1, n, n², n log n or log n, with an optional leading constant. Logarithms are base 2.</p>
        </form>

        <div className="card result" aria-live="polite">
          {out.error ? (
            <div className="errbox"><b>{out.error[0]}</b>{out.error[1]}</div>
          ) : (
            <>
              <div className="proof-head">
                <div><span className="eyebrow">Inductive proof</span><h3>{res.recText}</h3></div>
                <span className={`pill ${v[0]}`}>{v[1]}</span>
              </div>
              <p className="claim">Claim <code>{res.claim}</code></p>
              <ol className="steps">
                {res.steps.map((st, i) => (
                  <li className="step" key={i}>
                    <div className="step-body">
                      <div className="step-title">{st.title}</div>
                      {st.why && <p className="step-why">{st.why}</p>}
                      {st.lines.length > 0 && <pre className="math">{st.lines.join('\n')}</pre>}
                    </div>
                  </li>
                ))}
              </ol>
              {res.consts.length > 0 && (
                <div className="consts">
                  <span className="lab">Constants</span>
                  {res.consts.map((c) => <span className="chip" key={c.k}>{c.k} {c.v}</span>)}
                  <span className="qed" title="Q.E.D." aria-label="End of proof">∎</span>
                </div>
              )}
              {res.cCheck && (
                <p className={`ccheck ${res.cCheck.ok ? 'ok' : 'bad'}`}>
                  {res.cCheck.ok
                    ? `Your c = ${fmtNum(res.cCheck.c)} is large enough (needs c ≥ ${fmtUp(res.cCheck.min)}).`
                    : `Your c = ${fmtNum(res.cCheck.c)} is too small. The induction needs c ≥ ${fmtUp(res.cCheck.min)}.`}
                </p>
              )}
              <p className="tightline">Tight bound for this recurrence: <b>{res.tightText}</b></p>
              {tr && (
                <figure className="chart">
                  <figcaption>
                    <b>Numerical check.</b> T(n) / g(n) with T(1) = 1, for n = 2, 4, 8 … {fmtN(lastPt.n)}.{' '}
                    {tr === 'rising' ? 'The ratio keeps climbing, so no constant c bounds T(n) by this guess.'
                      : tr === 'falling' ? 'The ratio keeps falling. The guess is an upper bound, but a loose one.'
                      : `The ratio levels off near ${fmtCompact(lastPt.ratio)}, which is what a tight bound looks like.`}
                  </figcaption>
                  <Chart pts={pts} />
                </figure>
              )}
              {onAsk && <button type="button" className="btn ask" onClick={ask}>Ask AI about this proof</button>}
            </>
          )}
        </div>
      </div>

      <SubstitutionQuiz onAsk={onAsk} />
    </div>
  );
}
