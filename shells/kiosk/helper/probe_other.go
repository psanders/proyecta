// Copyright (C) 2026 by Proyecta. All rights reserved.

//go:build !linux && !windows

package main

import "runtime"

// devProbe lets the helper run on a developer's Mac: it reports itself as a Linux kiosk with no
// machine figures, so every metric reads as not measured.
type devProbe struct{ version string }

func newProbe(version, _ string) Probe { return devProbe{version: version} }

func (p devProbe) Info() Info {
	return Info{Shell: "KIOSK_LINUX", Version: p.version, HwID: "dev-helper", CPUCores: runtime.NumCPU()}
}

func (devProbe) Metrics() Metrics { return Metrics{} }
