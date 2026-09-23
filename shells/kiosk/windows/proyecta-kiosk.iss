; Copyright (C) 2026 by Proyecta. All rights reserved.
;
; One installer for Windows kiosks: the helper as a Windows service (restarted on failure), the
; player's files, and Microsoft Edge in kiosk mode at logon. Edge ships with Windows.
; Build: iscc /DVersion=0.9.0 proyecta-kiosk.iss (from shells/kiosk/windows, after build.sh).

#ifndef Version
  #define Version "0.0.0"
#endif
#define Url "http://127.0.0.1:47800/"

[Setup]
AppId={{6A1E0C1F-5E7B-4B7E-9C2D-5B2B7F3C9A10}
AppName=Proyecta Kiosk
AppVersion={#Version}
AppPublisher=Proyecta
AppPublisherURL=https://proyecta.do
DefaultDirName={autopf}\Proyecta
DisableDirPage=yes
DisableProgramGroupPage=yes
OutputDir=..\build
OutputBaseFilename=ProyectaKiosk-{#Version}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
Compression=lzma2
SolidCompression=yes

[Languages]
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
Source: "..\build\windows-amd64\proyecta-helper.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\..\packages\player\dist\*"; DestDir: "{app}\player"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Every user who logs on gets the player full screen in Edge.
Name: "{commonstartup}\Proyecta"; Filename: "{commonpf32}\Microsoft\Edge\Application\msedge.exe"; \
  Parameters: "--kiosk {#Url} --edge-kiosk-type=fullscreen --no-first-run --autoplay-policy=no-user-gesture-required"

[Run]
Filename: "{sys}\sc.exe"; Parameters: "create ProyectaHelper binPath= ""\""{app}\proyecta-helper.exe\"" -root \""{app}\player\"""" start= auto DisplayName= ""Proyecta kiosk helper"""; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "failure ProyectaHelper reset= 60 actions= restart/2000/restart/2000/restart/10000"; Flags: runhidden
Filename: "{sys}\sc.exe"; Parameters: "start ProyectaHelper"; Flags: runhidden

[UninstallRun]
Filename: "{sys}\sc.exe"; Parameters: "stop ProyectaHelper"; Flags: runhidden; RunOnceId: "StopHelper"
Filename: "{sys}\sc.exe"; Parameters: "delete ProyectaHelper"; Flags: runhidden; RunOnceId: "DeleteHelper"
