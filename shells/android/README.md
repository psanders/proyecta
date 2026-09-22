# Proyecta Android shell (Kotlin)

Placeholder. Built in the `player-shells` OpenSpec change: one full-screen WebView activity,
HOME/Leanback launcher, keep-screen-on, autoplay allowed, renderer-crash recovery, and a
`ProyectaShell` JS bridge exposing `ANDROID_ID` as the hardware id. Gradle project, outside npm workspaces.

## Offline boot is a requirement, not a nicety

The browser player is fetched over HTTP and has no service worker, so a device that cold-starts
with no network shows Chrome's `ERR_INTERNET_DISCONNECTED` page — measured, not theoretical: link
a player, take the network away, reload, and that is what appears on the screen. A vallero whose
power returns before their ISP does would show a browser error to the street.

The shell fixes this properly by packaging the player's assets locally instead of loading them
from the network, and keeping the last rotation and its media across a restart. Boot with no
network SHALL still play; it SHALL never show a browser error page.

This is why it belongs here rather than in a service worker in `packages/player`: the shell
already owns the app's delivery, so there is no cache to invalidate and no stale-shell risk.
