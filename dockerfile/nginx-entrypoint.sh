#!/bin/bash
set -e

# Select and start nginx with the appropriate complete configuration
if [ "$NGINX_ENV" = "K8S" ]; then
    echo "Using K8S nginx configuration"
    exec nginx -c /etc/nginx/nginx.k8s.conf -g "daemon off;"
else
    echo "Using compose nginx configuration"
    exec nginx -c /etc/nginx/nginx.compose.conf -g "daemon off;"
fi
