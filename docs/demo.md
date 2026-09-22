# Running the marketplace end to end

How to drive the whole product locally — publish a screen, have an advertiser request an ad,
approve or reject it, watch it play, and see the play priced. Useful for demos, for trying a
change by hand, and as the shape the e2e suite automates.

## Start

```bash
npm run db:up            # Postgres 5433, Fonoster Identity 50052, Mailpit 8026
npm run db:migrate
scripts/generate-demo-ads.sh   # the default rotation a screen plays before it has ads
npm run dev:api          # http://localhost:3000
npm run dev:dashboard    # http://localhost:5175
npm run dev:player       # http://localhost:5174
```

Then seed the scenario:

```bash
npm run seed:demo
```

It prints the accounts and the player URL. It is idempotent — run it again any time to get back
to a known state, including after a run that failed halfway.

|            |                                                                                       |
| :--------- | :------------------------------------------------------------------------------------ |
| Owner      | `owner@proyecta.local` / `proyecta123` — business **Vallas del Caribe**               |
| Advertiser | `advertiser@proyecta.local` / `proyecta123` — business **Café Aroma**                 |
| Player     | `http://localhost:5174/?hw=demo-player-1` — already linked to _Malecón Santo Domingo_ |

The two businesses are deliberately separate. A play of an ad belonging to the business that owns
the screen is a **house play**: recorded and counted, but never billable. Billing follows
businesses, not people — one person belonging to both businesses does not change this.

## The walkthrough

1. **Open the player** at `http://localhost:5174/?hw=demo-player-1`. It is linked to _Malecón
   Santo Domingo_ and plays the default rotation. Add `?debug=1` for the status overlay.

2. **Sign in as the owner** at `http://localhost:5175`. Both screens show as complete; Malecón
   shows _En línea_.

3. **Approve or reject the waiting request.** Open **Solicitudes** — one pending request from Café
   Aroma. Open it and either:
   - **Aprobar** — the player picks the ad up within a couple of seconds over SSE, and its
     manifest version switches to the screen's own rotation.
   - **Rechazar** — pick a reason (a note is required for _Otro_); the advertiser sees the
     rejection and the reason on their ad.

4. **Watch it play.** With the ad approved, the player rotates it in. Each finished slot is
   queued and flushed to `POST /device/v1/play-logs` about every 30 seconds.

5. **See the money.** Open the screen's detail. _Hoy_ and _Últimos 7 días_ count plays and
   earnings. At the seeded rate of US$ 0.75 per 5 seconds, one 10-second play earns US$ 1.50.

   Nothing is charged to anyone: the accounting capability turns play logs into accounting facts
   and stops there. Invoicing and payouts are explicitly out of scope, and there is no payment
   code in the repo.

## Publishing another screen

**Pantallas → Agregar pantalla.** A screen is _complete_ — and so visible to advertisers — only
once it has coordinates, available days, hours and a rate. Until then it is listed as incomplete
and never appears in the advertiser's catalog.

To put a real player on it, open `http://localhost:5174/?hw=<any-new-id>` in another tab, read
the code it shows, and enter it on the screen.

## Checking it yourself

```bash
npm run lint && npm run typecheck && npm test   # the fast gate
npm run test:integration                        # needs db:up
npm run test:e2e                                # needs db:up; starts the dev servers itself
```

CI runs all of these: `test.yml` for the fast gate, `verify.yml` for integration and e2e against
the same `compose.dev.yaml` stack this page uses.

## When something looks wrong

- **Identity restarting in a loop** — almost always Postgres being down; `npm run db:up` fixes it.
- **Typecheck failing with missing Prisma models** (`ad`, `asset`, `userSettings`) — the generated
  client is stale. `npm run db:generate`. `db:migrate` skips generation when the schema is already
  in sync, so this bites after pulling.
- **The player shows a pairing code instead of ads** — the device is not linked to a screen, or
  the screen's rotation is empty.
- **The player shows a browser error page** — it was started with no network. The player is served
  over HTTP and has no service worker, so a cold start offline cannot load the app at all.
