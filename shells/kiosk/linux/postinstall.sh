#!/bin/sh
# Copyright (C) 2026 by Proyecta. All rights reserved.
#
# Creates the kiosk user and starts the helper and the kiosk on boot.
set -e

if ! id proyecta >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/proyecta --shell /usr/sbin/nologin \
    --groups video,render,input proyecta 2>/dev/null ||
    useradd --system --create-home --home-dir /var/lib/proyecta --shell /usr/sbin/nologin proyecta
fi
install -d -o proyecta -g proyecta /var/lib/proyecta/chromium

systemctl daemon-reload
systemctl enable proyecta-helper.service proyecta-kiosk.service
systemctl set-default graphical.target
systemctl restart proyecta-helper.service
# The kiosk takes over tty1; it starts on the next boot rather than under the installing session.
