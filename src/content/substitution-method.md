# Substitution Method

The substitution method solves a recurrence in two moves. First you **guess** the shape of the answer. Then you **prove the guess by induction**, which also gives you the constants.

It is the most flexible method. It works when the Master Theorem does not apply, and a failed proof tells you how to fix your guess.

## The four steps

1. **Guess** a bound `T(n) = O(g(n))`. Pick `g(n)` from the usual growth rates: `1`, `log n`, `n`, `n log n`, `n²`, `2ⁿ`.
2. **Assume** the bound holds for all smaller inputs: `T(k) ≤ c·g(k)` for every `k < n`. This is the inductive hypothesis.
3. **Substitute** the hypothesis into the recurrence and simplify.
4. **Fix the constants.** Find `c > 0` and a starting point `n₀` so that the result is `≤ c·g(n)`. Then check the base case.

## Worked example: merge sort

Solve `T(n) = 2T(n/2) + n`.

**Guess.** `T(n) = O(n log n)`.

**Hypothesis.** `T(k) ≤ c·k log k` for all `k < n`.

**Substitute.**

```
T(n) ≤ 2 · [ c · (n/2) · log(n/2) ] + n
     = c·n·(log n − 1) + n
     = c·n·log n − c·n + n
```

**Fix the constants.** We want `T(n) ≤ c·n·log n`. That holds when `−c·n + n ≤ 0`, which means `c ≥ 1`.

**Base case.** `log 1 = 0`, so the bound says `T(1) ≤ 0`, which is false. Start the induction at `n₀ = 2` and choose `c` large enough to cover `T(2)` and `T(3)`.

So `T(n) = O(n log n)`. ∎

## When the proof almost works

Take `T(n) = 2T(n/2) + 1` and guess `O(n)`. With the hypothesis `T(k) ≤ c·k`:

```
T(n) ≤ 2·(c·n/2) + 1 = c·n + 1
```

That is **not** `≤ c·n`, even though the guess is correct. The fix is to make the hypothesis stronger by subtracting a lower-order term:

```
Hypothesis:  T(k) ≤ c·k − d
T(n) ≤ 2·(c·n/2 − d) + 1 = c·n − 2d + 1
```

Now `c·n − 2d + 1 ≤ c·n − d` whenever `d ≥ 1`, so the induction closes.

## When the guess is too small

Take `T(n) = 2T(n/2) + n` and guess `O(n)`:

```
T(n) ≤ 2·(c·n/2) + n = c·n + n
```

`c·n + n` is bigger than `c·n` for every `c`. No constant repairs this, which tells you the guess is too small. The true answer is `Θ(n log n)`.

## Common mistakes

- **Changing the constant mid-proof.** Prove `T(n) ≤ c·g(n)` for the same `c` you assumed. Ending with `≤ (c + 1)·g(n)` does not close the induction.
- **Skipping the base case.** The bound must hold at the starting values, not only in the inductive step.
- **Forgetting that `log 1 = 0`.** Guesses with a `log n` factor need `n₀ ≥ 2`.
- **Dropping the lower-order terms too early.** When the plain hypothesis fails by a small amount, try subtracting a term as shown above.

## Try it

Use the solver on this page. Pick *Merge sort* to see the proof above, then try *Guess too small* to watch the induction fail.
