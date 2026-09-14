/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CODE_UNAVAILABLE_MESSAGES } from "@proyecta/common";
import { Brand } from "../../components/AuthLayout.js";
import { CodeInput } from "../../components/CodeInput.js";
import { Card } from "../../components/ui/Card.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Icon } from "../../components/ui/Icon.js";
import { errorMessage } from "../../lib/errors.js";
import { trpc } from "../../lib/trpc.js";
import { strings } from "../../strings.js";

/** Pencil frame onboarding: download the player, type the TV's code, continue to the screen form. */
export function OnboardingPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const check = trpc.screens.checkCode.useQuery(
    { code },
    { enabled: code.length === 8, retry: false, staleTime: 0 }
  );
  const availability = code.length === 8 ? check.data : undefined;
  const unavailable =
    availability && !availability.available ? CODE_UNAVAILABLE_MESSAGES[availability.reason] : null;

  const next = () => {
    if (!availability?.available) return;
    const query = new URLSearchParams({
      codigo: code,
      ...(availability.resolution ? { resolucion: availability.resolution } : {})
    });
    navigate(`/pantallas/nueva?${query}`);
  };

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex items-center justify-between px-10 py-6">
        <Brand dark />
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          {strings.onboarding.exit}
        </Link>
      </header>
      <div className="mx-auto flex w-[640px] max-w-full flex-col items-center gap-6 px-6 pt-10 pb-16 text-center">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs">
          {strings.onboarding.pill}
        </span>
        <h1 className="font-mono text-[40px] leading-tight font-medium">
          {strings.onboarding.title}
        </h1>
        <p className="text-[15px] text-muted-foreground">{strings.onboarding.body}</p>
        <Card className="mt-4 w-full text-left">
          <div className="flex flex-col gap-1 px-6 pt-6">
            <h2 className="text-[15px] font-semibold">{strings.onboarding.cardTitle}</h2>
            <p className="text-[13px] text-muted-foreground">{strings.onboarding.cardBody}</p>
          </div>
          <ol className="flex flex-col gap-5 p-6">
            <li className="flex items-center justify-between gap-4">
              <Step n={1} title={strings.onboarding.step1} body={strings.onboarding.step1Body} />
              <a
                href="/descargas/reproductor"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 font-mono text-sm font-medium"
              >
                <Icon name="download" />
                {strings.onboarding.download}
              </a>
            </li>
            <li className="flex items-center justify-between gap-4">
              <Step n={2} title={strings.onboarding.step2} body={strings.onboarding.step2Body} />
              <CodeInput
                label={strings.onboarding.step2}
                value={code}
                onChange={setCode}
                error={unavailable ?? undefined}
              />
            </li>
          </ol>
          <div className="px-6">
            {availability?.available ? (
              <Alert tone="success">{strings.onboarding.found}</Alert>
            ) : unavailable ? (
              <Alert tone="warning">{unavailable}</Alert>
            ) : check.error ? (
              <Alert tone="error">{errorMessage(check.error)}</Alert>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4 p-6">
            <Link
              to="/pantallas/nueva"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {strings.onboarding.skip}
            </Link>
            <Button onClick={next} disabled={!availability?.available}>
              {strings.onboarding.submit}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs">
        {n}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-[13px] text-muted-foreground">{body}</span>
      </div>
    </div>
  );
}
