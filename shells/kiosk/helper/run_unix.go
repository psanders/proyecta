// Copyright (C) 2026 by Proyecta. All rights reserved.

//go:build !windows

package main

import (
	"log"
	"net/http"
)

// defaultRoot is where the .deb installs the player.
const defaultRoot = "/usr/share/proyecta/player"

// run serves in the foreground; systemd supervises and restarts the process.
func run(server *http.Server) {
	if err := serve(server); err != nil {
		log.Fatal(err)
	}
}
