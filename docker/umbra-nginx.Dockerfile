ARG NGINX_BASE_IMAGE=nginx:alpine
FROM ${NGINX_BASE_IMAGE}

LABEL org.opencontainers.image.title="Ruyin Nginx Gateway"
LABEL org.opencontainers.image.description="Umbra public SNI gateway and HTTP virtual host runtime"

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD nginx -t || exit 1
