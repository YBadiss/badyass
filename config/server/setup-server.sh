#!/bin/bash
# Base setup for the rebuilt droplet (Ubuntu 26.04). Run as root via sudo. Safe to re-run.
# Users: deploy (CI, owns /var/www, runs PM2, sudo only for nginx test/reload), claude (sudo), admin (owner, sudo).
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

ADMIN_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFbjawFqRajnNZB/lJqIFGnTb2lINmAQ7tHz/qifMVtR digital ocean github access key'
CI_PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILawpmijcuKKm/unM0IUgeR3Y1HiRt3baMI2UQ6dHQef ci-deploy@github-actions'

echo "== packages"
apt-get update -q
apt-get -y -q full-upgrade
apt-get -y -q install nginx certbot python3-certbot-nginx ufw fail2ban unattended-upgrades \
  curl ca-certificates gnupg rsync unzip build-essential python3

echo "== Node 24"
# Ubuntu 26.04 ships Node 22; use NodeSource's Node 24 (bundles npm)
install -d -m 755 /etc/apt/keyrings
[ -f /etc/apt/keyrings/nodesource.gpg ] || curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
printf 'Package: nodejs\nPin: origin deb.nodesource.com\nPin-Priority: 1001\n' > /etc/apt/preferences.d/nodesource
apt-get update -q && apt-get -y -q install nodejs
# let unattended-upgrades patch Node too
echo 'Unattended-Upgrade::Origins-Pattern { "site=deb.nodesource.com"; };' > /etc/apt/apt.conf.d/52unattended-nodesource
node -v
npm install -g --no-fund --no-audit pm2@latest
pm2 -v

echo "== swap (1G)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== users"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
# Ubuntu ships a legacy "admin" group, so create the admin user inside it
id admin >/dev/null 2>&1 || useradd -m -s /bin/bash -g admin admin
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh /home/deploy/secrets
install -d -m 700 -o admin -g admin /home/admin/.ssh
echo "no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-pty ${CI_PUBKEY}" > /home/deploy/.ssh/authorized_keys
echo "${ADMIN_PUBKEY}" > /home/admin/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys; chown admin:admin /home/admin/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys /home/admin/.ssh/authorized_keys

cat > /tmp/sudoers.deploy <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
EOF
cat > /tmp/sudoers.admin <<'EOF'
admin ALL=(ALL) NOPASSWD: ALL
EOF
for u in deploy admin; do visudo -cf /tmp/sudoers.$u && install -m 440 -o root -g root /tmp/sudoers.$u /etc/sudoers.d/$u; rm -f /tmp/sudoers.$u; done
# Ubuntu 26.04 uses sudo-rs (no log_output support); commands are still logged to the journal.
printf 'claude ALL=(ALL) NOPASSWD: ALL\n' > /tmp/sudoers.claude && visudo -cf /tmp/sudoers.claude && install -m 440 -o root -g root /tmp/sudoers.claude /etc/sudoers.d/claude; rm -f /tmp/sudoers.claude

echo "== Bun (for metro-api), installed for deploy and linked into PATH"
if [ ! -x /home/deploy/.bun/bin/bun ]; then
  sudo -u deploy -H bash -c 'curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.9"' >/dev/null
fi
ln -sfn /home/deploy/.bun/bin/bun /usr/local/bin/bun
bun -v

echo "== PM2 as deploy, started at boot"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u deploy --hp /home/deploy >/dev/null
systemctl enable pm2-deploy >/dev/null

echo "== web dirs"
chown deploy:deploy /var/www
install -d -m 755 -o deploy -g deploy /var/www/badyass.xyz /var/www/recip.it /var/www/recip.it/data

echo "== nginx"
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/conf.d/00-hardening.conf <<'EOF'
server_tokens off;
# Ubuntu's nginx 1.28.3-2ubuntu1.13 carries the Nov 2026 HTTP/2 fixes (CVE-2026-123007/123633)
http2 on;
EOF
# Catch-all: drop requests for unknown hostnames / bare IP
cat > /etc/nginx/conf.d/01-default-server.conf <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    return 444;
}
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    ssl_reject_handshake on;
}
EOF
sed -i -E 's/^(\s*)server_tokens .*/\1# server_tokens set in conf.d\/00-hardening.conf/' /etc/nginx/nginx.conf
nginx -v

echo "== sshd"
cat > /etc/ssh/sshd_config.d/10-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
MaxAuthTries 3
AllowUsers deploy claude admin
EOF
sshd -t

echo "== firewall"
ufw default deny incoming >/dev/null; ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null; ufw status | head -1

echo "== fail2ban (sshd jail)"
systemctl enable --now fail2ban >/dev/null; fail2ban-client status sshd | head -3 || true

echo "== unattended-upgrades with automatic reboot at 04:30 UTC"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
cat > /etc/apt/apt.conf.d/51unattended-reboot <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF
systemctl enable --now unattended-upgrades >/dev/null

echo "== journald: cap at 200M"
install -d /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=200M\n' > /etc/systemd/journald.conf.d/size.conf
systemctl restart systemd-journald

echo "== setup done (sshd not yet reloaded; restore step swaps host keys first)"
