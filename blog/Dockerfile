# --- Stage 1: Build the Site ---
# Pinned to the version Northlight is tested against (HUGO_IMAGE in its
# Makefile); the theme declares min_version = 0.164.0.
FROM ghcr.io/gohugoio/hugo:v0.167.0@sha256:7bb99a126eddeea8fbfaacedc5ef6708805411bdeaa01e668405a137fd02d048 AS builder

# The image runs as uid 1000; the build writes to /src and /target, both owned by
# root after COPY.
USER root

WORKDIR /src

COPY . .

RUN hugo --minify --gc -d /target

# --- Stage 2: Serve with Nginx ---
# nginx-unprivileged (uid 101, no root master) so the Deployment can assert
# runAsNonRoot and drop every capability; minor tag so Renovate tracks it.
FROM nginxinc/nginx-unprivileged:1.31-alpine-slim@sha256:c81a27f28bc2d9c2da8998444e653c7b85b9bbbaa92e44ef18d8920784e06507

# Drop the base image's default index.html/50x.html — serve only Hugo's output.
USER root
RUN rm -rf /usr/share/nginx/html/*
USER 101

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /target /usr/share/nginx/html

# 8080: unprivileged cannot bind below 1024. The Service maps 80 to this.
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
