import { useState } from 'react';
import { makeQuiz } from '../utils/quizGenerator';

/**
 * Practice quiz for the substitution method. Questions are generated from the solver,
 * so every answer is computed. Press "New quiz" for different questions.
 *
 * Props
 *   onAsk (optional): function(questionText). Shows "Ask AI to explain my mistakes".
 */
export default function SubstitutionQuiz({ onAsk }) {
  const [qs, setQs] = useState(() => makeQuiz());
  const [picks, setPicks] = useState({});

  const answered = Object.keys(picks).length;
  const score = qs.filter((q) => picks[q.id] === q.answer).length;
  const done = answered === qs.length;

  const restart = () => { setQs(makeQuiz()); setPicks({}); };

  const askAboutMistakes = () => {
    const wrong = qs.filter((q) => picks[q.id] !== q.answer);
    const text = wrong.map((q) =>
      `Question: ${q.prompt}${q.math ? `\n${q.math}` : ''}\nMy answer: ${q.options[picks[q.id]]}\nCorrect answer: ${q.options[q.answer]}\n${q.explain}`
    ).join('\n\n');
    onAsk(`I got these substitution-method quiz questions wrong. Explain each one step by step.\n\n${text}`);
  };

  return (
    <section className="card quiz" aria-label="Practice quiz">
      <div className="quiz-head">
        <div>
          <span className="eyebrow">Practice quiz</span>
          <h3 className="card-title">Test yourself on the substitution method</h3>
        </div>
        <span className={`pill ${done ? (score === qs.length ? 'ok' : 'warn') : ''}`}>
          {done ? `Score ${score} / ${qs.length}` : `${answered} of ${qs.length} answered`}
        </span>
      </div>

      <ol className="quiz-list">
        {qs.map((q) => {
          const chosen = picks[q.id];
          const locked = chosen !== undefined;
          return (
            <li className="q" key={`${q.id}-${q.prompt}`}>
              <p className="q-prompt">{q.prompt}</p>
              {q.math && <pre className="math">{q.math}</pre>}
              <div className="choices" role="group" aria-label={q.prompt}>
                {q.options.map((opt, i) => {
                  let state = '';
                  if (locked && i === q.answer) state = 'right';
                  else if (locked && i === chosen) state = 'wrong';
                  return (
                    <button key={opt} type="button" className={`choice ${state}`} disabled={locked}
                      onClick={() => setPicks((p) => ({ ...p, [q.id]: i }))}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {locked && (
                <p className={`q-explain ${chosen === q.answer ? 'ok' : 'bad'}`}>
                  <b>{chosen === q.answer ? 'Correct.' : 'Not quite.'}</b> {q.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="actions">
        <button type="button" className="btn primary" onClick={restart}>New quiz</button>
        {done && onAsk && score < qs.length && (
          <button type="button" className="btn" onClick={askAboutMistakes}>Ask AI to explain my mistakes</button>
        )}
      </div>
    </section>
  );
}
