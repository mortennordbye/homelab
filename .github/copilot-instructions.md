# Copilot Instructions

Follow these conventions for commits and pull requests in this repository.

## Commit Message Format

Use conventional commits: `<type>(<scope>): <description>`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic changes)
- `refactor`: Code refactoring (no bug fixes or features)
- `perf`: Performance improvements
- `test`: Test additions or corrections
- `build`: Build system or dependency changes
- `ci`: CI configuration changes
- `chore`: Maintenance tasks

**Scopes:**

- `k8s`: Kubernetes configurations
- `terraform`: Terraform/IaC changes
- `infra`: Infrastructure components
- `apps`: Application deployments
- `blog`: Blog-related changes
- `portfolio`: Portfolio site changes
- `argocd`: ArgoCD configurations
- `readme`: Documentation updates
- `ci`: CI/CD workflows
- `monitoring`: Observability stack
- `network`: Network configurations
- `storage`: Storage configurations

**Examples:**

```
feat(k8s): add gluetun VPN configuration
fix(terraform): resolve API token validation
docs(readme): update tech stack with links
chore(ci): upgrade container scan workflow
```

**Breaking Changes:**
Add `BREAKING CHANGE:` in the commit footer:

```
feat(k8s): replace nginx with cilium gateway API

BREAKING CHANGE: removes nginx ingress controller in favor of cilium gateway API
```

---

## Pull Request Format

### Title

Use the same format as commits: `<type>(<scope>): <description>`

Use imperative mood: "add" not "added", "update" not "updates"

### Description Structure

**What Changed**

- List concrete changes made to files, configurations, or features
- Be specific about components modified

**Why**

- Explain the motivation or problem being solved
- Reference issues if applicable (e.g., `Fixes #123`)

**Breaking Changes** (if applicable)

- Clearly mark breaking changes with `BREAKING CHANGE:` prefix
- Explain migration path or required actions

**Testing**

- Describe verification steps performed
- Include test commands or manual testing procedures

**Deployment Notes** (if applicable)

- Document any required configuration changes
- Note dependencies or prerequisites
- Include rollback procedures if relevant

---

## Best Practices

- Keep messages technical and factual
- Include file paths or component names when relevant
- Avoid vague terms like "various updates" or "improvements"
- Reference related issues or PRs when applicable
- For infrastructure changes, document the impact on running services
