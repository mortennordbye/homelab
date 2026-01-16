# Contributing to Eden Homelab

Thank you for your interest in contributing to my homelab project! While this is primarily a personal infrastructure repository, contributions, suggestions, and feedback are welcome.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion:

1. Check if the issue already exists in the [issue tracker](https://github.com/mortennordbye/homelab/issues)
2. If not, create a new issue with:
   - Clear description of the problem or suggestion
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Your environment details if relevant

### Proposing Changes

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** following the project conventions
4. **Test your changes** thoroughly
5. **Commit with conventional commits** format:
   ```
   feat(scope): add new feature
   fix(scope): resolve issue
   docs(scope): update documentation
   ```
6. **Push to your fork** and create a Pull Request

### Pull Request Guidelines

- Follow the [conventional commits](https://www.conventionalcommits.org/) format
- Include a clear description of what changed and why
- Reference any related issues
- Ensure all workflows pass
- Keep PRs focused on a single concern

## Code Style

### Terraform/IaC

- Use consistent formatting: `terraform fmt`
- Add comments for complex logic
- Follow HashiCorp's style guide

### Kubernetes Manifests

- Use consistent YAML formatting (2 spaces)
- Add descriptive labels and annotations
- Follow ArgoCD sync-wave ordering

### Documentation

- Keep README.md up to date
- Use clear, concise language
- Include examples where helpful

## Testing

Before submitting:

- Test infrastructure changes in a non-production environment
- Verify Kubernetes manifests: `kubectl apply --dry-run=client`
- Check Terraform plans: `terraform plan`
- Run container scans if changing Dockerfiles

## Questions?

Feel free to:

- Open an issue for discussion
- Reach out via [LinkedIn](https://www.linkedin.com/in/morten-victor-nordbye/)
- Check the [README](README.md) for architecture details

## License

By contributing, you agree that your contributions will be licensed under the same license as this project.
