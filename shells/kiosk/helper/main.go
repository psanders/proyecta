// Copyright (C) 2026 by Proyecta. All rights reserved.

// proyecta-helper runs next to the kiosk browser as its own process. It serves the player's files
// from disk (so the kiosk boots and plays with no network), tells the player about the machine at
// /shell/info and /shell/metrics, and proxies the device protocol and media to the Proyecta API.
// It never plays media and never calls the API on its own; the player in the browser does.
package main

import (
	"errors"
	"flag"
	"log"
	"net/http"
	"net/url"
	"time"
)

// version is set at build time: -ldflags "-X main.version=0.9.0".
var version = "dev"

func main() {
	listen := flag.String("listen", "127.0.0.1:47800", "loopback address to serve on")
	root := flag.String("root", defaultRoot, "directory holding the player's dist/")
	api := flag.String("api", "https://api.proyecta.do", "Proyecta API origin")
	flag.Parse()

	if err := CheckLoopback(*listen); err != nil {
		log.Fatal(err)
	}
	apiURL, err := url.Parse(*api)
	if err != nil || apiURL.Scheme == "" || apiURL.Host == "" {
		log.Fatalf("invalid -api %q", *api)
	}

	server := &http.Server{
		Addr:              *listen,
		Handler:           NewHandler(Config{Listen: *listen, Root: *root, API: apiURL}, newProbe(version, *root)),
		ReadHeaderTimeout: 10 * time.Second,
	}
	run(server)
}

// serve runs until the server stops; ErrServerClosed is a clean stop.
func serve(server *http.Server) error {
	log.Printf("proyecta-helper %s serving on http://%s", version, server.Addr)
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
