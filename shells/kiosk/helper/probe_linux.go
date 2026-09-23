// Copyright (C) 2026 by Proyecta. All rights reserved.

package main

import (
	"os"
	"runtime"
	"strings"
	"sync"
	"syscall"
)

const mb = 1024 * 1024

// linuxProbe reads /proc, /etc and statfs. CPU load is system-wide ("system" scope).
type linuxProbe struct {
	version string
	root    string // the player's files: the disk figures are for the volume holding them
	mu      sync.Mutex
	lastCPU *CPUTimes
}

func newProbe(version, root string) Probe {
	return &linuxProbe{version: version, root: root}
}

func (p *linuxProbe) Info() Info {
	return Info{
		Shell:       "KIOSK_LINUX",
		Version:     p.version,
		HwID:        readTrimmed("/etc/machine-id"),
		DeviceModel: truncate(deviceModel(), 80),
		OSVersion:   truncate(ParseOSRelease(readTrimmed("/etc/os-release")), 40),
		CPUCores:    runtime.NumCPU(),
	}
}

func (p *linuxProbe) Metrics() Metrics {
	var m Metrics
	if total, used, ok := ParseMeminfo(readTrimmed("/proc/meminfo")); ok {
		m.MemoryTotalMb, m.MemoryUsedMb = total, used
	}
	var fs syscall.Statfs_t
	if syscall.Statfs(p.root, &fs) == nil {
		total := int64(fs.Blocks) * int64(fs.Bsize)
		free := int64(fs.Bavail) * int64(fs.Bsize)
		m.DiskTotalMb, m.DiskUsedMb = total/mb, (total-free)/mb
	}
	if times, ok := ParseProcStat(readTrimmed("/proc/stat")); ok {
		p.mu.Lock()
		if p.lastCPU != nil {
			if percent, ok := CPUPercent(*p.lastCPU, times); ok {
				m.CPUPercent, m.CPUScope = &percent, "system"
			}
		}
		p.lastCPU = &times
		p.mu.Unlock()
	}
	return m
}

// deviceModel is the DMI product name on PCs, or the device-tree model on boards like the Pi.
func deviceModel() string {
	vendor := readTrimmed("/sys/devices/virtual/dmi/id/sys_vendor")
	product := readTrimmed("/sys/devices/virtual/dmi/id/product_name")
	if product != "" {
		if vendor != "" && !strings.HasPrefix(product, vendor) {
			return vendor + " " + product
		}
		return product
	}
	return strings.TrimRight(readTrimmed("/proc/device-tree/model"), "\x00")
}

func readTrimmed(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
