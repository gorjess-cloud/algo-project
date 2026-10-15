// Quiz generator for the substitution method.
// Questions about recurrences are answered by the same solver the workbench uses,
// so the correct answer is always computed, never guessed.
import { parseRec, classify, buildResult, fmtUp } from './substitutionLogic';

const CANDIDATES = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)'];

// Recurrences whose tight bound is a clean polynomial or n log n.
const CLEAN = [
  '2T(n/2) + n', '2T(n/2) + 1', 'T(n/2) + 1', '4T(n/2) + n', 'T(n/2) + n',
  '2T(n/2) + n^2', '8T(n/2) + n^2', '3T(n/3) + n', 'T(n-1) + n', 'T(n-1) + 1', 'T(n-1) + n^2',
];
// Extra recurrences that make good "does the guess hold?" questions.
const ANY = [...CLEAN, '3T(n/2) + n', '2T(n/2) + n log n', '2T(n-1) + 1', '7T(n/2) + n^2'];

const VERDICT_OPTIONS = [
  'The proof holds and the bound is tight',
  'The proof holds, but the bound is not tight',
  'The proof fails because the guess is too small',
];
const VERDICT_INDEX = { tight: 0, loose: 1, invalid: 2 };

const CONCEPTS = [
  {
    prompt: 'What do you assume in the inductive hypothesis?',
    options: ['T(k) ≤ c·g(k) for every k < n', 'T(n) ≤ c·g(n)', 'T(k) = g(k) exactly, for every k', 'The recurrence has no base case'],
    answer: 0,
    explain: 'You assume the bound for all smaller inputs, then prove it for n.',
  },
  {
    prompt: 'Why does a guess with a log n factor need n₀ ≥ 2?',
    options: ['Because log 1 = 0, so the bound would claim T(1) ≤ 0', 'Because log n is undefined for n = 2', 'Because c must be at least 2', 'Because the recurrence changes at n = 2'],
    answer: 0,
    explain: 'At n = 1 the bound c·n·log n equals 0, but T(1) is a positive constant, so start at n₀ = 2.',
  },
  {
    prompt: 'For T(n) = 2T(n/2) + 1 with guess O(n), the plain hypothesis gives T(n) ≤ c·n + 1, which is too big. What fixes it?',
    options: ['Subtract a lower-order term: T(k) ≤ c·k − d', 'Change the guess to O(n²)', 'Use a larger c', 'Drop the +1 from the recurrence'],
    answer: 0,
    explain: 'A larger c does not help because the +1 stays on top. The −d term absorbs it, and the proof closes for d ≥ 1.',
  },
  {
    prompt: 'No constant c can make the induction close. What does that tell you?',
    options: ['The guess is too small', 'The recurrence has no solution', 'The base case is wrong', 'c must be negative'],
    answer: 0,
    explain: 'If the leftover term outgrows the slack for every c, the true growth rate is larger than your guess.',
  },
  {
    prompt: 'Which step comes last in the substitution method?',
    options: ['Choose c and n₀ and check the base case', 'Guess the form of the solution', 'State the inductive hypothesis', 'Substitute into the recurrence'],
    answer: 0,
    explain: 'The order is guess, assume, substitute, then fix the constants.',
  },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const solve = (eq, guess) => buildResult(parseRec(eq).rec, classify(guess), null);
const tightGuess = (eq) => CANDIDATES.find((g) => solve(eq, g).verdict === 'tight') || null;

function tightQuestion(used) {
  for (let tries = 0; tries < 60; tries++) {
    const eq = pick(CLEAN);
    const right = tightGuess(eq);
    if (!right || used.has(eq)) continue;
    used.add(eq);
    const res = solve(eq, right);
    const options = shuffle([right, ...shuffle(CANDIDATES.filter((g) => g !== right)).slice(0, 3)]);
    return {
      kind: 'tight',
      prompt: 'Which bound is tight for this recurrence?',
      math: res.recText,
      options,
      answer: options.indexOf(right),
      explain: `${res.recText} solves to ${res.tightText}.`,
    };
  }
  return null;
}

function verdictQuestion(used, avoid) {
  for (let tries = 0; tries < 80; tries++) {
    const eq = pick(ANY);
    const guess = pick(CANDIDATES);
    const key = `${eq}|${guess}`;
    if (used.has(key)) continue;
    const res = solve(eq, guess);
    if (!(res.verdict in VERDICT_INDEX) || res.verdict === avoid) continue;
    used.add(key);
    const why = res.verdict === 'tight' ? 'Your guess matches it.'
      : res.verdict === 'loose' ? 'Your guess is above it, so it holds but is not tight.'
      : 'Your guess is below it, so the induction cannot close.';
    return {
      kind: 'verdict',
      verdict: res.verdict,
      prompt: `You guess ${res.claim}. What happens when you try to prove it by substitution?`,
      math: res.recText,
      options: VERDICT_OPTIONS,
      answer: VERDICT_INDEX[res.verdict],
      explain: `The tight bound for ${res.recText} is ${res.tightText}. ${why}`,
    };
  }
  return null;
}

function constantQuestion() {
  for (let tries = 0; tries < 60; tries++) {
    const eq = pick(CLEAN);
    const guess = tightGuess(eq);
    if (!guess) continue;
    const res = solve(eq, guess);
    const hit = res.consts.map((c) => ({ k: c.k, m: /^≥ ([0-9.]+)$/.exec(c.v) })).find((c) => c.m);
    if (!hit) continue;
    const x = parseFloat(hit.m[1]);
    const right = fmtUp(x);
    const pool = [x / 2, x * 2, x + 1, x * 1.5, x + 2, 1, 2, 3].map(fmtUp);
    const wrong = shuffle([...new Set(pool)].filter((v) => v !== right && parseFloat(v) > 0)).slice(0, 3);
    if (wrong.length < 3) continue;
    const options = shuffle([right, ...wrong]);
    return {
      kind: 'constant',
      prompt: `You prove T(n) ∈ ${guess}. What is the smallest ${hit.k} for which the induction closes?`,
      math: res.recText,
      options,
      answer: options.indexOf(right),
      explain: `The proof closes for every ${hit.k} ≥ ${right}, so ${right} is the smallest.`,
    };
  }
  return null;
}

/** Build a fresh quiz. Each call returns different questions. */
export function makeQuiz() {
  const usedEq = new Set();
  const usedPair = new Set();
  const q1 = verdictQuestion(usedPair, null);
  const list = [
    tightQuestion(usedEq),
    q1,
    constantQuestion(),
    verdictQuestion(usedPair, q1 && q1.verdict),
    { kind: 'concept', ...pick(CONCEPTS) },
  ].filter(Boolean);
  return list.map((q, i) => {
    if (q.kind !== 'concept') return { ...q, id: i };
    const options = shuffle(q.options);
    return { ...q, id: i, options, answer: options.indexOf(q.options[q.answer]) };
  });
}
