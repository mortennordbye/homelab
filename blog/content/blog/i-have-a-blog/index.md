---
title: "Yet Another Tech Blog (I'm Sorry)"
description: "Why I built yet another tech blog, and how it ships: a Hugo site containerised and deployed to Kubernetes through GitOps with GitHub Actions and ArgoCD."
date: 2026-01-13
draft: false
tags: ["kubernetes", "gitops", "argocd", "intermediate", "homelab"]
---

# Yet Another Tech Blog (I'm Sorry)

You know what 2026 was really missing? Another tech blog. The internet was dangerously close to running out of hot takes on Kubernetes, Docker, and homelab setups. But don't worry I'm here to fix that. Welcome to [blog.nordbye.it](https://blog.nordbye.it).

_If you find this useful or just appreciate the over-engineering, drop a ⭐ on the [Homelab repo](https://github.com/mortennordbye/Homelab). I'm chasing that sweet GitHub achievement._

## The Stack

The blog runs on Hugo with the Blowfish theme, gets shoved into a Docker container, deploys via GitHub Actions to my Talos Kubernetes cluster, and is babysat by ArgoCD. Static files served by Nginx. Simple? Yes. Over-engineered? Absolutely. That's the point.

All the code referenced in this post is available in my [Homelab repository](https://github.com/mortennordbye/Homelab). You can clone it and adapt it for your own setup.

## Why Hugo? (Briefly)

It's fast. It builds in milliseconds and outputs plain HTML. I added Blowfish as a git submodule because I have trust issues with `npm` and I like knowing exactly which commit broke my blog.

```bash
git submodule add https://github.com/nunocoracao/blowfish.git blog/themes/blowfish
```

But you're not here for static site generators. You're here for the pipelines.

## The Dockerfile: Multi-Stage Build

First, we need to containerize Hugo. This is a two-stage build: build the site, then serve it with Nginx.

**Full file:** [`blog/Dockerfile`](https://github.com/mortennordbye/Homelab/blob/main/blog/Dockerfile)

```dockerfile
# --- Stage 1: Build the Site ---
FROM alpine:3.23 AS builder

WORKDIR /src

# Install Hugo extended from GitHub releases
RUN apk add --no-cache \
    wget \
    ca-certificates \
    nodejs \
    npm \
    libstdc++ \
    gcompat \
    && wget -O hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v0.154.5/hugo_extended_0.154.5_linux-amd64.tar.gz \
    && tar -xzf hugo.tar.gz \
    && mv hugo /usr/bin/hugo \
    && rm hugo.tar.gz LICENSE README.md \
    && chmod +x /usr/bin/hugo

COPY . .

# Install NPM dependencies if package.json exists
RUN if [ -f package.json ]; then npm install; fi

# Build the site
RUN hugo --minify --gc -d /target

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /target /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The final image is ~40MB. Hugo builds in under a second. Nginx serves static files without breaking a sweat.

**Nginx config:** [`blog/nginx.conf`](https://github.com/mortennordbye/Homelab/blob/main/blog/nginx.conf)

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
}
```

## The "GitOps" Part (Or: How to Overcomplicate a Blog Update)

Most people just build an image, tag it `:latest`, and tell Kubernetes to pull `Always`. But I have standards. And more importantly, I have ArgoCD.

If you use `:latest`, ArgoCD looks at your cluster, looks at your Git repo, sees `image: blog:latest` in both places, and says "My job here is done." Meanwhile, your actual container has changed, and you're left manually killing pods to force a pull. Disgusting.

To do this properly, we need **Immutable Tags**. Every commit to the blog should result in a unique image tag (like the short SHA), and this is the kicker: we need to automatically update the Kubernetes manifest in Git to match.

### The Pipeline of Death (Avoidance)

Here is the logic for the GitHub Action. It listens for changes in the `blog/` folder, builds the image, and then commits the new tag back to `k8s/talos/apps/blog/deployment.yaml`.

**The Danger:** If you aren't careful, your Action commits to the repo, which triggers the Action again, which builds a new image, which commits to the repo... and suddenly you've burned 4,000 build minutes in an hour and GitHub sends you a polite email asking you to stop.

We solve this with **Path Filtering**.

```yaml
on:
  push:
    branches: ["main"]
    paths:
      - "blog/**" # Only run if I actually touch the blog source
```

Since the Action only updates the manifest inside `k8s/`, the workflow doesn't trigger itself. It’s elegant.

### The "Sed" Hack

I briefly considered installing `yq` to parse the YAML properly. Then I remembered I’m an engineer, not a masochist. Why download a binary when `sed` is right there?

We generate a short SHA for the tag, build the image, push it to GHCR, and then surgical-strike the deployment file:

```yaml
steps:
  - name: Generate Short SHA
    id: vars
    run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

  # [Insert Docker Build & Push Steps Here]

  - name: Update Kubernetes Manifest
    run: |
      NEW_IMAGE="ghcr.io/mortennordbye/homelab/blog:${{ steps.vars.outputs.sha_short }}"

      # The magic. Find the image line, replace it.
      # No YAML parsing, no dependencies, just vibes.
      sed -i "s|image: ghcr.io/mortennordbye/homelab/blog:.*|image: $NEW_IMAGE|g" k8s/talos/apps/blog/deployment.yaml

      # Commit it back
      git config --global user.name "GitHub Actions"
      git config --global user.email "actions@github.com"
      git add k8s/talos/apps/blog/deployment.yaml
      git commit -m "chore(blog): update image tag to ${{ steps.vars.outputs.sha_short }}"
      git push
```

Is it "Enterprise Grade"? Yes and no. You'd be surprised how many enterprise customers use setups like this. Does it work flawlessly and execute in under 2 seconds? Yes.

## The Kubernetes Manifests

The deployment is straightforward. ArgoCD watches these files and applies them to the cluster.

**Deployment:** [`k8s/talos/apps/blog/deployment.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/apps/blog/deployment.yaml)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog
  namespace: blog
  labels:
    app.kubernetes.io/name: blog
spec:
  replicas: 2
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: blog
  template:
    metadata:
      labels:
        app.kubernetes.io/name: blog
    spec:
      containers:
        - name: blog
          image: ghcr.io/mortennordbye/homelab/blog:2694c9b # Updated by GitHub Actions
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 80
          resources:
            requests:
              cpu: 10m
              memory: 32Mi
            limits:
              cpu: 100m
              memory: 64Mi
          livenessProbe:
            httpGet:
              path: /
              port: http
          readinessProbe:
            httpGet:
              path: /
              port: http
```

The image tag (`2694c9b` in this example) is the short SHA of the commit. Every time I push to the blog, GitHub Actions updates this line. That's the entire trick.

You'll also need a Service to expose the deployment and an HTTPRoute for ingress (I use Traefik with Gateway API, which is [a topic for another post](/blog/surviving-nginx-eol/)).

## ArgoCD: The Closer

Once GitHub Actions pushes that tiny YAML change, the baton is passed.

ArgoCD sits in my cluster watching the repo. It sees the deployment file change from `image: ...:a1b2c` to `image: ...:d4e5f`. It realizes the Live state (cluster) differs from the Desired state (git). It syncs. It prunes. It heals.

By default, ArgoCD polls Git repositories every 3 minutes looking for changes. So worst case, there's a 3-minute delay between your commit and ArgoCD noticing. You can lower this interval in the ArgoCD config, or set up webhooks for instant notifications (but honestly, 3 minutes is fine for most use cases).

The entire flow looks like this: I write markdown, push to main, GitHub Actions builds and tags the image (20 seconds), updates the manifest, ArgoCD polls and detects the change (up to 3 minutes), syncs the cluster (10 seconds), and the blog is live. Best case? 45 seconds. Worst case? 3.5 minutes. Either way, I never touch `kubectl`. I never SSH into anything. Git is the only interface.

### Enabling ArgoCD Auto-Sync

By default, ArgoCD detects drift but waits for manual approval before syncing. That's safe, but also boring. To achieve full automation, you need to enable `automated` sync policies.

Here's how I configure my ArgoCD ApplicationSet to auto-sync all apps:

**Full file:** [`k8s/talos/infra/argocd/apps.yaml`](https://github.com/mortennordbye/Homelab/blob/main/k8s/talos/infra/argocd/apps.yaml)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/mortennordbye/homelab.git
        revision: HEAD
        directories:
          - path: k8s/talos/apps/*
  template:
    spec:
      syncPolicy:
        automated:
          prune: true # Delete resources removed from Git
          selfHeal: true # Revert manual kubectl changes
        retry:
          limit: 1
          backoff:
            duration: 10s
            factor: 2
            maxDuration: 3m
        syncOptions:
          - ApplyOutOfSyncOnly=true
          - PruneLast=true
          - ServerSideApply=true
```

**The magic settings:**

- `automated: {}` enables auto-sync. ArgoCD applies changes automatically when Git differs from the cluster.
- `prune: true` means if you delete a file from Git, ArgoCD deletes the resource from Kubernetes. No orphaned deployments.
- `selfHeal: true` means if someone runs `kubectl edit` and modifies a resource, ArgoCD reverts it back to the Git state within minutes. Git is the source of truth. Always.

**For a single Application** (not an ApplicationSet), the syntax is identical:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: blog
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/mortennordbye/homelab.git
    path: k8s/talos/apps/blog
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: blog
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Without `automated`, you'd have to click "Sync" in the ArgoCD UI every time GitHub Actions updates the manifest. With it enabled, the entire pipeline is hands-off. Push markdown → Actions builds → Manifest updates → ArgoCD syncs → Blog is live.

## How to Replicate This Setup

Want to build this yourself? Here's the checklist:

1. Fork or clone the repo: [github.com/mortennordbye/Homelab](https://github.com/mortennordbye/Homelab)
2. Set up Hugo with a theme by adding your theme as a git submodule under `blog/themes/`
3. Create the Dockerfile using the multi-stage build pattern from [`blog/Dockerfile`](https://github.com/mortennordbye/Homelab/blob/main/blog/Dockerfile)
4. Configure GitHub Actions by copying [`.github/workflows/build-blog.yaml`](https://github.com/mortennordbye/Homelab/blob/main/.github/workflows/build-blog.yaml) and adjusting paths/image names
5. Set up Kubernetes manifests (deployment, service, and httproute in your k8s folder)
6. Install ArgoCD in your cluster and point it at your Git repo
7. Write markdown, push to main, watch the magic

The beauty of this setup is that it scales. Replace "blog" with "frontend" or "api" and the same pattern works. Immutable tags, automated manifest updates, GitOps sync. No manual kubectl commands. No `:latest` crimes.

## Final Thoughts

Is this amount of automation necessary for a blog that gets 0 visitors a month? No. But if I wanted to do things the easy way, I would have used WordPress.

Everything's open source at [github.com/mortennordbye/homelab](https://github.com/mortennordbye/homelab). Go judge my code, steal the workflows, and build something ridiculous.
