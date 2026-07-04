Wind down this session:

1. Ensure all tests and typecheck pass on the branch; if anything is red, either fix it
   or revert the offending change — never leave main-bound work red.
2. Update docs/STATE.md so it is completely accurate: current phase, what works, exact
   next 1–3 steps (file/test references), known issues.
3. Create docs/sessions/<today>-session-NN.md using the format in the documentation
   strategy (goal / done / blocked / next session starts with).
4. For anything parked or discovered-but-not-fixed, create a GitHub issue labelled with
   the current phase, and reference it in STATE.md.
5. Update the phase DoD checklist in docs/delivery/phase-plan.md for anything completed.
6. Commit docs updates with message "docs: session NN wrap-up". Then give me a 5-line
   summary and the exact first action for next session.