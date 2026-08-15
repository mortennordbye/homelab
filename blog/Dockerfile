# --- Stage 1: Build the Site ---
# The official multi-arch Hugo extended image, pinned to an exact version so the
# build is reproducible. This is the same image and version the Northlight theme
# is developed and tested against (HUGO_IMAGE in its Makefile), and the theme
# declares min_version = 0.164.0.
FROM ghcr.io/gohugoio/hugo:v0.165.0 AS builder

# The image runs as uid 1000; the build writes to /src and /target, both owned by
# root after COPY.
USER root

WORKDIR /src

# Copy source files including theme
COPY . .

# Build the site
# --minify: Compress HTML
# --gc: Garbage collect unused resources
RUN hugo --minify --gc -d /target

# --- Stage 2: Serve with Nginx ---
# nginx-unprivileged rather than stock nginx: it runs as uid 101 with no
# master process running as root, so the Deployment can assert runAsNonRoot
# and drop every capability. Same image the bigd app already uses. Pinned to
# a minor tag so Renovate tracks it — the previous `nginx:alpine` carried no
# version at all, which meant no bot was watching the runtime base image.
FROM nginxinc/nginx-unprivileged:1.31-alpine

# The base image ships a default index.html and 50x.html. Clearing them keeps
# the served root exactly what Hugo produced, and nothing else.
USER root
RUN rm -rf /usr/share/nginx/html/*
USER 101

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder /target /usr/share/nginx/html

# 8080, not 80: an unprivileged process cannot bind a port below 1024, and
# granting NET_BIND_SERVICE back would defeat the point. The Service maps
# its own port 80 to this, so nothing upstream of the Service changes.
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
