// Copyright (C) 2026 by Proyecta. All rights reserved.

//go:build windows

package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"golang.org/x/sys/windows/svc"
)

// defaultRoot is where the Windows installer puts the player.
const defaultRoot = `C:\Program Files\Proyecta\player`

// ServiceName is the Windows service the installer registers (restarted by the service manager
// on failure).
const ServiceName = "ProyectaHelper"

// run serves as a Windows service when started by the service manager, or in the foreground when
// started from a console (useful for support).
func run(server *http.Server) {
	isService, err := svc.IsWindowsService()
	if err != nil {
		log.Fatal(err)
	}
	if !isService {
		if err := serve(server); err != nil {
			log.Fatal(err)
		}
		return
	}
	if err := svc.Run(ServiceName, &service{server: server}); err != nil {
		log.Fatal(err)
	}
}

type service struct{ server *http.Server }

func (s *service) Execute(_ []string, requests <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	status <- svc.Status{State: svc.StartPending}
	failed := make(chan error, 1)
	go func() { failed <- serve(s.server) }()
	status <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop | svc.AcceptShutdown}

	for {
		select {
		case err := <-failed:
			// Exit non-zero so the service manager's recovery actions restart the helper.
			log.Print(err)
			return true, 1
		case request := <-requests:
			switch request.Cmd {
			case svc.Interrogate:
				status <- request.CurrentStatus
			case svc.Stop, svc.Shutdown:
				status <- svc.Status{State: svc.StopPending}
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				_ = s.server.Shutdown(ctx)
				cancel()
				return false, 0
			}
		}
	}
}
