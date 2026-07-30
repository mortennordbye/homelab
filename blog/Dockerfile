# --- Stage 1: Build the Site ---
# The official multi-arch Hugo extended image, pinned to an exact version so the
# build is reproducible. This is the same image and version the Northlight theme
# is developed and tested against (HUGO_IMAGE in its Makefile), and the theme
# declares min_version = 0.164.0.
FROM ghcr.io/gohugoio/hugo:v0.164.0 AS builder

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
FROM nginx:alpine

# Clean default Nginx files
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder /target /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
