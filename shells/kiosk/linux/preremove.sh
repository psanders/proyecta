#!/bin/sh
# Copyright (C) 2026 by Proyecta. All rights reserved.
set -e
systemctl disable --now proyecta-kiosk.service proyecta-helper.service 2>/dev/null || true
