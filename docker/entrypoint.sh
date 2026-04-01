#!/bin/sh
set -e

# Ensure storage and bootstrap/cache are writable (important for mounted volumes)
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Create the public/storage symlink (idempotent)
php artisan storage:link --force

# Run database migrations
php artisan migrate --force

# Cache Laravel config/routes/views/events for performance
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Hand off to the container's main command (supervisord or queue:work)
exec "$@"
