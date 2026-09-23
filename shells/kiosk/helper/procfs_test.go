// Copyright (C) 2026 by Proyecta. All rights reserved.

package main

import "testing"

func TestParseMeminfoUsesMemAvailable(t *testing.T) {
	text := "MemTotal:        8048576 kB\nMemFree:          512000 kB\nMemAvailable:    6000000 kB\n"
	total, used, ok := ParseMeminfo(text)
	if !ok || total != 7859 || used != 2000 {
		t.Fatalf("got total=%d used=%d ok=%v", total, used, ok)
	}
}

func TestParseMeminfoRejectsMissingFields(t *testing.T) {
	if _, _, ok := ParseMeminfo("MemTotal: 8048576 kB\n"); ok {
		t.Fatal("expected no reading without MemAvailable")
	}
}

func TestCPUPercentBetweenTwoSamples(t *testing.T) {
	first, ok1 := ParseProcStat("cpu  100 0 100 700 100 0 0 0 0 0\ncpu0 1 2 3 4 5\n")
	second, ok2 := ParseProcStat("cpu  250 0 250 1300 200 0 0 0 0 0\n")
	if !ok1 || !ok2 {
		t.Fatal("expected both samples to parse")
	}
	// 1000 jiffies elapsed, 700 of them idle (idle + iowait): 30 % busy.
	percent, ok := CPUPercent(first, second)
	if !ok || percent < 29.99 || percent > 30.01 {
		t.Fatalf("got %v ok=%v", percent, ok)
	}
}

func TestCPUPercentNeedsElapsedTime(t *testing.T) {
	sample := CPUTimes{Idle: 10, Total: 100}
	if _, ok := CPUPercent(sample, sample); ok {
		t.Fatal("expected no reading for identical samples")
	}
}

func TestParseOSRelease(t *testing.T) {
	got := ParseOSRelease("NAME=\"Debian GNU/Linux\"\nPRETTY_NAME=\"Debian GNU/Linux 12 (bookworm)\"\n")
	if got != "Debian GNU/Linux 12 (bookworm)" {
		t.Fatalf("got %q", got)
	}
}
