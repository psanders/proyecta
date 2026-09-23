// Copyright (C) 2026 by Proyecta. All rights reserved.

package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// Info is what /shell/info returns; it matches shellInfoSchema in packages/common.
type Info struct {
	Shell       string `json:"shell"`
	Version     string `json:"version"`
	HwID        string `json:"hwId,omitempty"`
	DeviceModel string `json:"deviceModel,omitempty"`
	OSVersion   string `json:"osVersion,omitempty"`
	CPUCores    int    `json:"cpuCores,omitempty"`
}

// Metrics is what /shell/metrics returns; it matches shellMetricsSchema in packages/common.
// Every figure is the whole machine's: RAM, the disk holding the player, system-wide CPU load.
type Metrics struct {
	CPUPercent    *float64 `json:"cpuPercent,omitempty"`
	CPUScope      string   `json:"cpuScope,omitempty"`
	MemoryUsedMb  int64    `json:"memoryUsedMb,omitempty"`
	MemoryTotalMb int64    `json:"memoryTotalMb,omitempty"`
	DiskUsedMb    int64    `json:"diskUsedMb,omitempty"`
	DiskTotalMb   int64    `json:"diskTotalMb,omitempty"`
}

// Probe reads the machine. Implemented per OS; stubbed in tests.
type Probe interface {
	Info() Info
	Metrics() Metrics
}

// Config is how the helper was started.
type Config struct {
	Listen string // must be a loopback address
	Root   string // the player's dist/
	API    *url.URL
}

// CheckLoopback refuses any listen address other than loopback: the helper serves machine data
// and proxies the device's credentials, so nothing on the LAN may reach it.
func CheckLoopback(listen string) error {
	host, _, err := net.SplitHostPort(listen)
	if err != nil {
		return fmt.Errorf("listen address %q: %w", listen, err)
	}
	ip := net.ParseIP(host)
	if host != "localhost" && (ip == nil || !ip.IsLoopback()) {
		return fmt.Errorf("listen address %q is not loopback", listen)
	}
	return nil
}

// NewHandler serves the player, the shell endpoints, and proxies the device protocol and media to
// the API so the player stays same-origin. It never plays media and adds no protocol logic.
func NewHandler(cfg Config, probe Probe) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /shell/info", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, probe.Info())
	})
	mux.HandleFunc("GET /shell/metrics", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, probe.Metrics())
	})

	proxy := httputil.NewSingleHostReverseProxy(cfg.API)
	proxy.FlushInterval = -1 // /device/v1/events is a long-lived SSE stream
	base := proxy.Director
	proxy.Director = func(r *http.Request) {
		base(r)
		r.Host = cfg.API.Host
	}
	for _, prefix := range []string{"/device/", "/media/", "/content/"} {
		mux.Handle(prefix, proxy)
	}

	mux.Handle("/", player(cfg.Root))
	return mux
}

// player serves dist/ with a fallback to index.html for unknown paths, like the SPA's nginx.
func player(root string) http.Handler {
	files := http.FileServer(http.Dir(root))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := path.Clean("/" + r.URL.Path)
		if info, err := os.Stat(filepath.Join(root, filepath.FromSlash(clean))); err != nil || info.IsDir() {
			if clean != "/" && !strings.HasSuffix(clean, "/index.html") {
				r.URL.Path = "/"
			}
		}
		if r.URL.Path == "/" || strings.HasSuffix(r.URL.Path, ".html") {
			w.Header().Set("Cache-Control", "no-cache")
		}
		files.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(v)
}
