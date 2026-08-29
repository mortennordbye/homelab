---
title: "About"
description: "Morten Victor Nordbye, cloud engineer in Oslo. Who writes this blog, the cluster the posts come from, and why any of it should be trusted."
# The theme only honours showTableOfContents and showHero per page. The rest of
# the article toggles (author, word count, comments, sharing) are read from site
# config, so setting them here would be dead front matter.
showTableOfContents: false
---

I am Morten Victor Nordbye, a cloud engineer in Oslo. This blog is where the things I have had to work out get written down properly, usually because I could not find a straight answer when I needed one.

## The day job

I work at Orange Business, placed onto customer engagements. Most of 2026 has gone into an Azure migration for a betting platform, where I took over architect responsibility in April, moved around 30 .NET microservices off Windows Server onto AKS, and built the observability stack and production alerting in Terraform. Traffic peaks above 33 million requests a day on betting days.

Part of that migration was moving off ingress-nginx onto Traefik and the Gateway API. Serving several TLS certificates from one listener needed a workaround at the time, so I wrote the upstream patch that taught Gateway API to resolve multiple certificate secrets on a single listener. It shipped in Traefik v3.7.0.

Certifications, if that is what you came for: [CKA](https://nordbye.it/pdf/CKA.pdf), [LFS458](https://nordbye.it/pdf/LFS458.pdf), and Azure Solutions Architect Expert. The full history sits on [nordbye.it](https://nordbye.it/).

## The cluster the posts come from

Almost everything here is written from a homelab rather than from a customer environment, because I can show you the actual files.

It is a Talos Kubernetes cluster running as VMs on Proxmox, provisioned with Terraform and reconciled by ArgoCD. Cilium handles networking and policy, Traefik serves traffic through the Gateway API, and cert-manager, External Secrets Operator and Falco cover certificates, secrets and runtime security. Metrics, logs and traces go to kube-prometheus-stack, Loki and Tempo, read through Grafana. Storage is Proxmox CSI for block and a Synology over NFS for anything shared.

All of it is public in the [Homelab repository](https://github.com/mortennordbye/Homelab), including the manifests that run this blog. When a post shows you a config, that is the config that is running, and you can go and read the rest of the file.

## What gets written about

Kubernetes, networking, observability, and the parts of running infrastructure that are tedious enough that nobody writes them down. Posts tend to come out of something breaking, so they usually include what I got wrong first.

If you want to argue with something here, [LinkedIn](https://www.linkedin.com/in/morten-nordbye-325bb71bb) or an issue on the repo both work.
