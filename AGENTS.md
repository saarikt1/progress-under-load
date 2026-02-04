# Project Rules (Local)

## Test-First Development (TDD)

For any behavior change (features, bug fixes, security changes, parsing, data logic, UI behavior):

1) **Write or update tests first** to describe the desired behavior.
2) **Run the tests and confirm they fail** for the right reason (the “red” step).
3) **Implement the change**.
4) **Re-run tests and confirm they pass** (the “green” step).

### Exceptions

- Pure documentation changes.
- Mechanical refactors with no behavior change (still run the relevant tests).
- Styling-only changes that cannot be meaningfully tested (still add a minimal sanity test when practical).

## Errors, Warnings, and Access Issues

When errors, warnings, or access issues appear and the cause is not clear, stop and ask for guidance before proceeding. Resolve the issue immediately rather than choosing an alternate path.
