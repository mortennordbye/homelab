---
title: "Yet Another Tech Blog (I'm Sorry)"
date: 2026-01-13
draft: false
tags: ["meta", "kubernetes", "hugo", "homelab", "argocd", "docker"]
authors:
  - name: Morten Victor Nordbye
feature: "images/hugo.png"
---

# Yet Another Tech Blog (I'm Sorry)

You know what 2026 was really missing? Another tech blog. The internet was dangerously close to having enough content about Kubernetes, Docker, and homelab setups. But don't worry—I'm here to fix that. Welcome to [blog.nordbye.it](https://blog.nordbye.it)

## The Stack

The blog runs on Hugo with the Hextra theme, builds in Docker, deploys via GitHub Actions to my Kubernetes cluster, and gets managed by ArgoCD. Static files served by Nginx.

## Why Hugo?

Fast. That's mostly it. Hugo builds in milliseconds and outputs plain HTML. Static files are simple to deploy and cache well. The Hextra theme looked clean and works well for both blog posts and docs.

I added Hextra as a git submodule instead of through npm or hugo modules. I like knowing exactly what version of my theme I'm running, and having explicit control over updates.

If you clone the repo, you'll need to initialize the submodule:

```bash
git submodule update --init --recursive
```

To add the theme submodule in the first place:

```bash
git submodule add https://github.com/imfing/hextra.git blog/themes/hextra
```

## CI/CD

Push to the `blog/` directory, GitHub Actions kicks off, builds the container, pushes to `ghcr.io/mortennordbye/homelab/blog:latest`. Done. No fancy testing, no deployment pipelines with 47 stages. It either builds or it doesn't.

The critical bit was remembering to checkout with `submodules: recursive` in the workflow. Without that, the theme doesn't exist and Hugo gets confused.

## ArgoCD and GitOps

The blog lives in `k8s/talos/apps/blog/` with everything else. ArgoCD watches that directory and syncs changes automatically. Two replicas, a Service, an HTTPRoute for Gateway API. When I push a new container, ArgoCD notices and rolls it out. Usually works on the first try.

Sometimes ArgoCD gets stuck syncing and I have to manually tell it to hurry up, but that's more of a "me not being patient" problem than an ArgoCD problem.

## Final Thoughts

---

Everything's open source at [github.com/mortennordbye/homelab](https://github.com/mortennordbye/homelab).\_
