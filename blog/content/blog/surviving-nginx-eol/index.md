---
title: "Surviving the NGINX Ingress EOL: A Zero-Downtime Migration to Traefik"
date: 2026-02-17
draft: false
tags: ["kubernetes", "traefik", "nginx", "ingress", "gateway-api", "intermediate"]
authors:
  - name: Morten Victor Nordbye
---

Are you a Platform Engineer, an Architect, or a CTO who is currently losing sleep over how to handle the migration away from the good, reliable workhorse that is [`ingress-nginx`](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)?

It has been the backbone of Kubernetes clusters for a decade. It's been loyal. It's been steady. But it is retiring, and that realization is probably causing you some mild panic.

Fear not.

I am here to share exactly what I have learned from my current project. We were in your shoes. Running a mission-critical NGINX Ingress setup, staring down the barrel of End-of-Life, and realizing we had to move. We chose Traefik.

But let's get real. Swapping your Ingress Controller is terrifying. It's the operational equivalent of performing open-heart surgery while the patient is running a marathon. It's not just a "migration"; it's ripping out the front door of your house while guests are still walking in. One wrong move and you're explaining to the CEO why the entire platform is 404-ing.

Good news. We survived. And we did it without causing a panicked outage.

Here is exactly how we pulled off a parallel migration that kept us online, along with the specific Gateway API quirks that nearly broke us and how we fixed them.

## The Parallel Migration Strategy

The biggest misconception about migrating Ingress controllers is that it has to be a "rip and replace" operation. It doesn't. You can (and should) run them side-by-side.

We installed Traefik alongside our existing NGINX installation. They don't fight because they watch for different IngressClasses.

When you install Traefik, it creates its own LoadBalancer service. You end up with two distinct entry points into your cluster. The old NGINX LoadBalancer continues handling the legacy class, while the new Traefik LoadBalancer waits for the new class.

We didn't touch DNS immediately. Instead, we picked a low-priority service and simply duplicated the Ingress resource, changing only the class.

**The Old Way (NGINX):**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

**The New Way (Traefik):**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
spec:
  ingressClassName: traefik
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

By flipping the ingress class, the application starts responding on the Traefik LoadBalancer IP.

A quick tip here. Verify the migration before switching DNS. You can curl the new Traefik IP directly with a Host header to ensure routing is working.

```bash
curl -H "Host: app.example.com" http://5.6.7.8
```

Once verified, we updated the DNS record to point to the new Traefik LoadBalancer. The result was zero downtime. If something broke, we just reverted the DNS.

## Should You Move Straight to Gateway API?

Once you have Traefik running, you face a second decision. Do we rewrite everything to use the new Kubernetes Gateway API?

My advice is that it depends. How comfortable do you feel running "experimental" tech in your cluster?

Personally, I run Gateway API both at work and in my homelab, and honestly? I haven't had any major problems. It works.

But, if safety is your number one priority, or you have stakeholders who will literally cut your head off if a migration goes sideways, converting all your code overnight is probably not an option.

The beauty of Traefik is that you don't have to choose. It supports both the standard Ingress provider and the Gateway API provider simultaneously.

You can take the safe path and stick to standard Ingress for now. You likely already have the templates, it's fast, and it keeps the stakeholders happy. Alternatively, you can take the modern path and slowly migrate to Gateway API when you are ready, or use it specifically for the power-user features that Ingress struggles with, like traffic splitting or cross-namespace sharing.

You have the freedom to move at your own pace. Don't let the hype force you into a rewrite you aren't ready for.

## Gateway API Quirks (and How We Fixed Them)

While Gateway API is the future, it has growing pains. In our migration, we hit two specific roadblocks with Traefik's current implementation.

### No Sticky Sessions (Yet)

If your legacy applications rely on sticky sessions, you are going to hit a wall. Currently, Traefik's implementation of Gateway API does not support sticky sessions natively.

Since we run a hybrid setup, the fix was simple. We stayed on Ingress. For the specific services that needed stickiness, we just used the standard Ingress resource where Traefik supports sticky sessions perfectly.

There is a [PR in progress](https://github.com/traefik/traefik/pull/12537) to add this to the Gateway provider, so check the release notes. It might be merged by the time you read this.

### The "Default Cert" Panic

This was the moment that nearly gave us a heart attack.

Mid-migration, everything looked green. The Gateway resource reported "Programmed: True" and the routes were attached. We felt confident.

Then we hit the endpoint with a browser. Instead of our valid certificate, we were greeted by the default Traefik self-signed certificate.

Panic set in. Browsers were throwing security warnings, and we thought we had broken the entire TLS termination layer. We frantically checked the logs, but Traefik wasn't reporting errors. It just didn't know which certificate to use, so it fell back to the default one.

We realized that in its current state, Traefik's Gateway API implementation doesn't automatically look at the request hostname and intelligently pick the matching certificate from a shared pool. It gets confused.

To fix this, you can't just list all your certs on one listener. You have to hold Traefik's hand and explicitly map one Listener per Certificate.

We solved this by explicitly defining a separate Listener for every certificate we needed to serve in the Gateway resource.

**Step 1: Define Named Listeners**

In your Gateway config, create listeners for specific certificate groups and give them distinct names.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: traefik-gateway
spec:
  gatewayClassName: traefik
  listeners:
    # Listener for Domain A
    - name: websecure-cert-a
      port: 443
      protocol: HTTPS
      hostname: "*.domain-a.com"
      tls:
        certificateRefs:
          - name: cert-a-secret
    # Listener for Domain B
    - name: websecure-cert-b
      port: 443
      protocol: HTTPS
      hostname: "*.domain-b.com"
      tls:
        certificateRefs:
          - name: cert-b-secret
```

**Step 2: Reference the Section Name in HTTPRoute**

This is the critical part. In your route, you can't just point to the Gateway; you have to point to the specific section name that holds the correct cert.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-route
spec:
  parentRefs:
    - name: traefik-gateway
      sectionName: websecure-cert-a # <--- Explicitly picks the listener with Cert A
  hostnames:
    - "app.domain-a.com"
  rules:
    - backendRefs:
        - name: my-service
          port: 80
```

While this workaround works, it is verbose. I didn't want to leave it at that, so I decided to contribute back. I've opened a [Pull Request to Traefik](https://github.com/traefik/traefik/pull/12590) that improves the logic for matching certificates to listeners, which should remove the need for this strict mapping.

## Summary

The end of `ingress-nginx` isn't a disaster. It's an opportunity to modernize. By moving to Traefik, we got a more capable proxy and a bridge to the Gateway API future without breaking our production environment.

Start with a parallel migration, stick to standard Ingress for speed, and adopt Gateway API when you are ready. Just watch out for those sticky sessions!
