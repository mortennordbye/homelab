FROM nginx:alpine

# Copy as root-owned and lock down perms so the nginx user can't modify even if compromised
WORKDIR /usr/share/nginx/html

# Updated Path: Now relative to the project root
COPY ./src/frontend/ /usr/share/nginx/html/nordbye.it/

# Updated Path: configuration now lives in 'nginx/' folder
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Tighten permissions: directories 555 (rx), files 444 (r)
# Preserved your security hardening logic exactly
RUN find /usr/share/nginx/html/nordbye.it -type d -exec chmod 555 {} \; \
 && find /usr/share/nginx/html/nordbye.it -type f -exec chmod 444 {} \;

# Drop to the unprivileged user provided by the base image
USER nginx:nginx

EXPOSE 8080

# Healthcheck that doesn't write to disk
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

STOPSIGNAL SIGTERM
CMD ["nginx", "-g", "daemon off;"]
