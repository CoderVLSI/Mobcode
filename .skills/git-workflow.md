# Git Workflow

## Overview
Standard Git workflow patterns for feature development, code review, and collaboration.

## When to Use
- Starting new features
- Creating commits
- Managing branches
- Handling merge conflicts
- Code review process

## Branch Naming

```
feature/   - New features
bugfix/    - Bug fixes
hotfix/    - Urgent production fixes
refactor/  - Code refactoring
docs/      - Documentation updates
```

Examples:
- `feature/user-authentication`
- `bugfix/login-crash`
- `hotfix/payment-error`

## Commit Messages

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no code change)
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Examples
```bash
feat(auth): add login with Google OAuth
fix(navigation): prevent crash on back button
docs(readme): update installation steps
refactor(api): simplify error handling
```

## Common Workflows

### Start new feature
```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

### Save work in progress
```bash
git add .
git commit -m "wip: work in progress"
```

### Sync with main
```bash
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main
```

### Push changes
```bash
git push origin feature/my-feature
```

### Squash commits before PR
```bash
git rebase -i HEAD~3  # Squash last 3 commits
```

## Handling Conflicts

### During rebase
```bash
# Fix conflicts in files
git add <fixed-files>
git rebase --continue
```

### Abort if needed
```bash
git rebase --abort
```

## Useful Commands

### View history
```bash
git log --oneline -10
git log --graph --oneline
```

### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Discard local changes
```bash
git checkout -- <file>
git restore <file>
```

### Stash changes
```bash
git stash
git stash pop
git stash list
```

### Cherry-pick commit
```bash
git cherry-pick <commit-hash>
```

## Pull Request Checklist
- [ ] Branch is up to date with main
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Commits are clean and descriptive
- [ ] PR description explains changes
- [ ] Screenshots for UI changes
- [ ] Breaking changes documented
