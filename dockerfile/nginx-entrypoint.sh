#!/bin/bash
set -e

# Select and start nginx with the appropriate complete configuration
if [ "$NGINX_ENV" = "K8S" ]; then
    if [ "$INGRESS_ENABLED" = "false" ]; then
        echo "Using K8S nginx configuration (no ingress - proxying to backend services)"
        # Use envsubst to replace service name placeholders in the config
        # Only substitute our custom variables, preserve nginx variables like $host, $uri, etc.
        envsubst '${API_SERVICE_HOST} ${API_SERVICE_PORT} ${MCP_SERVICE_HOST} ${MCP_SERVICE_PORT}' \
            < /etc/nginx/nginx.k8s.no-ingress.conf \
            > /tmp/nginx.conf
        exec nginx -c /tmp/nginx.conf -g "daemon off;"
    else
        echo "Using K8S nginx configuration (with ingress)"
        exec nginx -c /etc/nginx/nginx.k8s.conf -g "daemon off;"
    fi
else
    echo "Using compose nginx configuration"
    exec nginx -c /etc/nginx/nginx.compose.conf -g "daemon off;"
fi
