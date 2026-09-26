# --- Stage 1: Build the Site ---
# Pinned to the version Northlight is tested against (HUGO_IMAGE in its
# Makefile); the theme declares min_version = 0.164.0.
FROM ghcr.io/gohugoio/hugo:v0.166.0@sha256:9f3cccb54b48e83a5468cd44f0372b10834b6d8418ef692d9821bb1314761829 AS builder

# The image runs as uid 1000; the build writes to /src and /target, both owned by
# root after COPY.
USER root

WORKDIR /src

COPY . .

RUN hugo --minify --gc -d /target

# --- Stage 2: Serve with Nginx ---
# nginx-unprivileged (uid 101, no root master) so the Deployment can assert
# runAsNonRoot and drop every capability; minor tag so Renovate tracks it.
FROM nginxinc/nginx-unprivileged:1.31-alpine-slim@sha256:123fb7283ffb4788e260d4e980005a978995fefedcdbb04d268077a19b84576d

# Drop the base image's default index.html/50x.html — serve only Hugo's output.
USER root
RUN rm -rf /usr/share/nginx/html/*
USER 101

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /target /usr/share/nginx/html

# 8080: unprivileged cannot bind below 1024. The Service maps 80 to this.
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
