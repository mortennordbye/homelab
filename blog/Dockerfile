# --- Stage 1: Build the Site ---
# Using alpine and installing Hugo extended from GitHub releases
FROM alpine:3.23 AS builder

WORKDIR /src

# Install Hugo extended, Node.js and other dependencies
RUN apk add --no-cache \
    wget \
    ca-certificates \
    nodejs \
    npm \
    && wget -O hugo.tar.gz https://github.com/gohugoio/hugo/releases/download/v0.154.5/hugo_extended_0.154.5_linux-amd64.tar.gz \
    && tar -xzf hugo.tar.gz \
    && mv hugo /usr/local/bin/ \
    && rm hugo.tar.gz \
    && chmod +x /usr/local/bin/hugo

# Copy source files
COPY . .

# Install NPM dependencies if package.json exists (Hextra might use it)
RUN if [ -f package.json ]; then npm install; fi

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
