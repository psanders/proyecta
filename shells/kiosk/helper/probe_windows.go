// Copyright (C) 2026 by Proyecta. All rights reserved.

//go:build windows

package main

import (
	"runtime"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

const mb = 1024 * 1024

var (
	kernel32                 = windows.NewLazySystemDLL("kernel32.dll")
	procGlobalMemoryStatusEx = kernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes       = kernel32.NewProc("GetSystemTimes")
)

type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

// windowsProbe reads the registry and Win32 APIs. CPU load is system-wide ("system" scope).
type windowsProbe struct {
	version string
	root    string
	mu      sync.Mutex
	lastCPU *CPUTimes
}

func newProbe(version, root string) Probe {
	return &windowsProbe{version: version, root: root}
}

func (p *windowsProbe) Info() Info {
	return Info{
		Shell:       "KIOSK_WINDOWS",
		Version:     p.version,
		HwID:        registryString(`SOFTWARE\Microsoft\Cryptography`, "MachineGuid"),
		DeviceModel: truncate(deviceModel(), 80),
		OSVersion:   truncate(registryString(`SOFTWARE\Microsoft\Windows NT\CurrentVersion`, "ProductName"), 40),
		CPUCores:    runtime.NumCPU(),
	}
}

func (p *windowsProbe) Metrics() Metrics {
	var m Metrics
	status := memoryStatusEx{Length: uint32(unsafe.Sizeof(memoryStatusEx{}))}
	if ok, _, _ := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&status))); ok != 0 {
		m.MemoryTotalMb = int64(status.TotalPhys / mb)
		m.MemoryUsedMb = int64((status.TotalPhys - status.AvailPhys) / mb)
	}
	var free, total, totalFree uint64
	if path, err := windows.UTF16PtrFromString(p.root); err == nil &&
		windows.GetDiskFreeSpaceEx(path, &free, &total, &totalFree) == nil {
		m.DiskTotalMb, m.DiskUsedMb = int64(total/mb), int64((total-free)/mb)
	}
	var idle, kernel, user windows.Filetime
	if ok, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idle)), uintptr(unsafe.Pointer(&kernel)), uintptr(unsafe.Pointer(&user)),
	); ok != 0 {
		// Kernel time includes idle time, so kernel + user is the total.
		times := CPUTimes{Idle: filetime(idle), Total: filetime(kernel) + filetime(user)}
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

func filetime(t windows.Filetime) uint64 {
	return uint64(t.HighDateTime)<<32 | uint64(t.LowDateTime)
}

func deviceModel() string {
	vendor := registryString(`HARDWARE\DESCRIPTION\System\BIOS`, "SystemManufacturer")
	product := registryString(`HARDWARE\DESCRIPTION\System\BIOS`, "SystemProductName")
	if vendor != "" && product != "" {
		return vendor + " " + product
	}
	return product
}

func registryString(path, name string) string {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, path, registry.QUERY_VALUE|registry.WOW64_64KEY)
	if err != nil {
		return ""
	}
	defer key.Close()
	value, _, err := key.GetStringValue(name)
	if err != nil {
		return ""
	}
	return value
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
