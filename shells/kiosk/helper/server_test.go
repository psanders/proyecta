// Copyright (C) 2026 by Proyecta. All rights reserved.

package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"
)

type stubProbe struct{}

func (stubProbe) Info() Info {
	return Info{Shell: "KIOSK_LINUX", Version: "0.9.0", HwID: "abc123", CPUCores: 4}
}

func (stubProbe) Metrics() Metrics {
	load := 12.5
	return Metrics{CPUPercent: &load, CPUScope: "system", MemoryTotalMb: 8000, MemoryUsedMb: 2000}
}

func newTestServer(t *testing.T) (*httptest.Server, *httptest.Server) {
	t.Helper()
	root := t.TempDir()
	must(t, os.WriteFile(filepath.Join(root, "index.html"), []byte("<main id=stage>"), 0o644))
	must(t, os.MkdirAll(filepath.Join(root, "assets"), 0o755))
	must(t, os.WriteFile(filepath.Join(root, "assets", "app.js"), []byte("boot()"), 0o644))

	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "api:"+r.URL.Path+":"+r.Header.Get("Authorization"))
	}))
	apiURL, _ := url.Parse(api.URL)
	helper := httptest.NewServer(NewHandler(Config{Root: root, API: apiURL}, stubProbe{}))
	t.Cleanup(func() { helper.Close(); api.Close() })
	return helper, api
}

func TestServesShellInfoAndMetrics(t *testing.T) {
	helper, _ := newTestServer(t)

	var info Info
	getJSON(t, helper.URL+"/shell/info", &info)
	if info.Shell != "KIOSK_LINUX" || info.HwID != "abc123" {
		t.Fatalf("info = %+v", info)
	}

	var metrics map[string]any
	getJSON(t, helper.URL+"/shell/metrics", &metrics)
	if metrics["cpuScope"] != "system" || metrics["memoryTotalMb"] != 8000.0 {
		t.Fatalf("metrics = %v", metrics)
	}
	if _, has := metrics["diskTotalMb"]; has {
		t.Fatal("an unmeasured figure must be omitted, not sent as 0")
	}
}

func TestProxiesTheDeviceProtocolWithItsCredentials(t *testing.T) {
	helper, _ := newTestServer(t)
	req, _ := http.NewRequest("GET", helper.URL+"/device/v1/state", nil)
	req.Header.Set("Authorization", "Bearer token")

	body := read(t, req)
	if body != "api:/device/v1/state:Bearer token" {
		t.Fatalf("body = %q", body)
	}
}

func TestServesThePlayerWithAnIndexFallback(t *testing.T) {
	helper, _ := newTestServer(t)
	for path, want := range map[string]string{
		"/":              "<main id=stage>",
		"/assets/app.js": "boot()",
		"/some/route":    "<main id=stage>",
	} {
		req, _ := http.NewRequest("GET", helper.URL+path, nil)
		if got := read(t, req); got != want {
			t.Errorf("%s = %q, want %q", path, got, want)
		}
	}
}

func TestRefusesNonLoopbackListenAddresses(t *testing.T) {
	for _, ok := range []string{"127.0.0.1:47800", "localhost:47800", "[::1]:47800"} {
		if err := CheckLoopback(ok); err != nil {
			t.Errorf("%s: %v", ok, err)
		}
	}
	for _, bad := range []string{"0.0.0.0:47800", ":47800", "192.168.1.20:47800", "nonsense"} {
		if CheckLoopback(bad) == nil {
			t.Errorf("%s was accepted", bad)
		}
	}
}

func getJSON(t *testing.T, url string, v any) {
	t.Helper()
	res, err := http.Get(url)
	must(t, err)
	defer res.Body.Close()
	must(t, json.NewDecoder(res.Body).Decode(v))
}

func read(t *testing.T, req *http.Request) string {
	t.Helper()
	res, err := http.DefaultClient.Do(req)
	must(t, err)
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	must(t, err)
	return string(body)
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}
