# Claude Instructions

## Git — Hands Off by Default

**Do not run any git commands unless I explicitly ask you to in this conversation.**

This applies to every branch. There is no exception for "helpful" automation.

### What this means in practice

- Do **not** run `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`, `git stash`, `git checkout`, `git switch`, `git branch`, or any other git subcommand unless I ask.
- Do **not** stage files, create commits, or modify the working tree state as a side effect of completing another task.
- Do **not** suggest "I'll also commit this for you" and then do it.
- Do **not** auto-commit after edits, refactors, test fixes, or any other code changes.

### How to get git help from me

Say so explicitly, and include the branch if it matters. Examples:

- "Commit these changes to `main` with the message '…'"
- "Push the current branch to origin"
- "Create a new branch called `feature/x` and switch to it"

If you don't name a branch, I'll confirm which one you mean before touching anything.

### Why this rule exists

Unintentional commits, pushes to the wrong branch, or rebases gone wrong can be painful to undo. Git operations are yours to control. I help with code; you decide what lands in version control and when.
