#!/bin/sh
set -e

# Select nginx configuration based on environment
if [ "$NGINX_ENV" = "K8S" ]; then
    echo "Using K8S nginx configuration"
    cp /etc/nginx/nginx.k8s.conf /etc/nginx/conf.d/default.conf
else
    echo "Using compose nginx configuration"
    cp /etc/nginx/nginx.compose.conf /etc/nginx/conf.d/default.conf
fi

# Start nginx
exec nginx -g "daemon off;"
