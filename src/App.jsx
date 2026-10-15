import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './App.css';
import SubstitutionSolver from './components/SubstitutionSolver';
import lessonMarkdown from './content/substitution-method.md?raw';

// Tiny hash router: "#substitution" shows the topic page, anything else shows the landing page.
// The browser's back button works, and no router library is needed.
const readPage = () => (window.location.hash === '#substitution' ? 'substitution' : 'home');

function Landing() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Algorithm analysis · Recurrence relations</p>
        <h1>Solve a recurrence by proving it.</h1>
        <p className="lede">
          Learn the substitution method: guess a bound, prove it by induction, and find the constants.
          Read the lesson, try your own recurrence, then test yourself.
        </p>
        <a className="cta" href="#substitution">Start the Substitution Method</a>
        <ul className="ladder" aria-label="Growth rates from slowest to fastest">
          <li className="ladder-label">Slowest to fastest</li>
          {['1', 'log n', 'n', 'n log n', 'n²', 'n³', '2ⁿ'].map((g, i) => (
            <li key={g} className="ladder-item">
              {i > 0 && <span className="gt" aria-hidden="true">&lt;</span>}
              <span className="chip-g">{g}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="topic-card" aria-labelledby="topic-title">
        <div>
          <p className="eyebrow">Topic</p>
          <h2 id="topic-title">Substitution Method</h2>
          <p className="topic-desc">Guess the form of the solution and prove it rigorously using mathematical induction.</p>
          <ul className="tags">
            <li>Lesson</li><li>Proof workbench</li><li>Practice quiz</li>
          </ul>
        </div>
        <a className="cta alt" href="#substitution">Open topic</a>
      </section>

      <ol className="path">
        <li><b>Read</b><span>The four steps, with merge sort worked out in full.</span></li>
        <li><b>Try</b><span>Type a recurrence and a guess. The workbench builds the proof.</span></li>
        <li><b>Practice</b><span>A new quiz every time, with answers worked out by the solver.</span></li>
      </ol>
    </>
  );
}

function SubstitutionPage() {
  const lessonHtml = useMemo(() => DOMPurify.sanitize(marked.parse(lessonMarkdown)), []);
  return (
    <>
      <a className="back" href="#">← All topics</a>
      {/* The lesson is Markdown from src/content, sanitized before it is rendered. */}
      <article className="lesson" dangerouslySetInnerHTML={{ __html: lessonHtml }} />
      <SubstitutionSolver />
    </>
  );
}

export default function App() {
  const [page, setPage] = useState(readPage);

  useEffect(() => {
    const onChange = () => setPage(readPage());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  return (
    <div className="app">
      <div className="shell">
        <header className="topbar">
          <a className="brand" href="#" aria-label="AlgoTutor home">
            <span className="brand-mark" aria-hidden="true">T</span>
            <span><span className="brand-name">Group 3: Recurrence Relations</span><span className="brand-sub"></span></span>
          </a>
          {page === 'substitution' && <span className="topnote">Substitution Method</span>}
        </header>

        <main className="main">
          {page === 'home' ? <Landing /> : <SubstitutionPage />}
        </main>

        <footer className="foot">
          <span>AlgoTutor · Recurrence relations</span>
          <span>Floors and ceilings are ignored. They do not change the asymptotic bound.</span>
        </footer>
      </div>
    </div>
  );
}
