# --- Stage 1: Build the Site ---
# Using klakegg/hugo image with extended version
FROM klakegg/hugo:ext-alpine AS builder

WORKDIR /src

# Install Node.js/NPM (Required for Hextra/Tailwind CSS generation)
RUN apk add --no-cache nodejs npm

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
