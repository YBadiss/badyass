#!/bin/bash
# Restores state from /tmp/droplet-backup.tgz onto the rebuilt droplet. Run as root via sudo, after setup-server.sh.
set -euo pipefail
B=/tmp/droplet-backup.tgz
T=$(mktemp -d); trap 'rm -rf "$T" "$B"' EXIT
tar xzf "$B" -C "$T"

echo "== SSH host keys (old ones back, so pinned fingerprints keep working)"
install -m 600 -o root -g root "$T"/etc/ssh/ssh_host_*_key /etc/ssh/
install -m 644 -o root -g root "$T"/etc/ssh/ssh_host_*_key.pub /etc/ssh/

echo "== Let's Encrypt"
rm -rf /etc/letsencrypt && cp -a "$T"/etc/letsencrypt /etc/letsencrypt

echo "== nginx vhosts (owned by deploy so CI can update them)"
for s in badyass footble recipit metro-boulot.photos; do
  install -m 644 -o deploy -g deploy "$T/etc/nginx/sites-available/$s" "/etc/nginx/sites-available/$s"
  ln -sfn "/etc/nginx/sites-available/$s" "/etc/nginx/sites-enabled/$s"
done
grep -q "limit_req_zone" /etc/nginx/sites-available/badyass && echo "  (badyass vhost carries its own limit_req_zone)"

echo "== recip.it data + backend env"
cp -a "$T"/var/www/recip.it/data/. /var/www/recip.it/data/
chown -R deploy:deploy /var/www/recip.it/data
install -m 600 -o deploy -g deploy "$T"/root/recip.it/backend/.env /home/deploy/secrets/recipit-backend.env

echo "== checks"
nginx -t
sshd -t
certbot certificates 2>/dev/null | grep -E "Certificate Name|Expiry" | paste - - | sed 's/^ *//'

systemctl reload nginx || systemctl restart nginx
systemctl restart ssh
echo "== restore done"
