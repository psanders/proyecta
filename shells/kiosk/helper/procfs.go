// Copyright (C) 2026 by Proyecta. All rights reserved.

package main

import (
	"bufio"
	"strconv"
	"strings"
)

const kb = 1024

// ParseMeminfo returns total and used RAM in MB from /proc/meminfo. Used is total minus
// MemAvailable, the kernel's own estimate of what programs can still get.
func ParseMeminfo(text string) (totalMb, usedMb int64, ok bool) {
	values := map[string]int64{}
	scanner := bufio.NewScanner(strings.NewReader(text))
	for scanner.Scan() {
		name, rest, found := strings.Cut(scanner.Text(), ":")
		if !found {
			continue
		}
		fields := strings.Fields(rest)
		if len(fields) == 0 {
			continue
		}
		if v, err := strconv.ParseInt(fields[0], 10, 64); err == nil {
			values[name] = v // kB
		}
	}
	total, hasTotal := values["MemTotal"]
	available, hasAvailable := values["MemAvailable"]
	if !hasTotal || !hasAvailable || total <= 0 {
		return 0, 0, false
	}
	return total / kb, (total - available) / kb, true
}

// CPUTimes are the aggregate jiffies from the "cpu" line of /proc/stat.
type CPUTimes struct {
	Idle  uint64
	Total uint64
}

// ParseProcStat reads the aggregate "cpu" line of /proc/stat. Idle includes iowait.
func ParseProcStat(text string) (CPUTimes, bool) {
	for line := range strings.SplitSeq(text, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 5 || fields[0] != "cpu" {
			continue
		}
		var times CPUTimes
		for i, field := range fields[1:] {
			v, err := strconv.ParseUint(field, 10, 64)
			if err != nil {
				return CPUTimes{}, false
			}
			// Fields: user nice system idle iowait irq softirq steal guest guest_nice. Guest time is
			// already counted in user/nice, so it is left out of the total.
			if i >= 8 {
				break
			}
			times.Total += v
			if i == 3 || i == 4 {
				times.Idle += v
			}
		}
		return times, true
	}
	return CPUTimes{}, false
}

// CPUPercent is the machine's CPU load between two samples, 0–100.
func CPUPercent(previous, current CPUTimes) (float64, bool) {
	total := float64(current.Total - previous.Total)
	if current.Total <= previous.Total || total <= 0 {
		return 0, false
	}
	busy := total - float64(current.Idle-previous.Idle)
	percent := busy / total * 100
	return min(max(percent, 0), 100), true
}

// ParseOSRelease returns PRETTY_NAME from /etc/os-release.
func ParseOSRelease(text string) string {
	for line := range strings.SplitSeq(text, "\n") {
		if value, found := strings.CutPrefix(line, "PRETTY_NAME="); found {
			return strings.Trim(value, `"'`)
		}
	}
	return ""
}
