/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CodeInput } from "../../components/CodeInput.js";
import { Card } from "../../components/ui/Card.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { Icon } from "../../components/ui/Icon.js";
import { cn } from "../../lib/cn.js";
import { errorMessage } from "../../lib/errors.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

/** Pencil frame onboarding: download the player, type the TV's code, continue to the screen form. */
export function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const check = trpc.screens.checkCode.useQuery(
    { code },
    { enabled: code.length === 8, retry: false, staleTime: 0 }
  );
  const availability = code.length === 8 ? check.data : undefined;
  const unavailable =
    availability && !availability.available ? t(`codeUnavailable.${availability.reason}`) : null;

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
        <div className="flex items-center gap-2">
          <Icon name="tv" className="size-6 text-primary" />
          <span className="font-mono text-base font-bold text-foreground">{t("brand")}</span>
        </div>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          {t("onboarding.exit")}
        </Link>
      </header>
      <div className="mx-auto flex w-[640px] max-w-full flex-col items-center gap-10 px-6 pt-10 pb-16 text-center">
        <span className="rounded-full bg-secondary px-2 py-2 font-mono text-sm leading-none text-foreground">
          {t("onboarding.pill")}
        </span>
        <div className="flex w-[560px] max-w-full flex-col gap-4">
          <h1 className="font-mono text-4xl leading-[1.2] font-medium">{t("onboarding.title")}</h1>
          <p className="text-base leading-normal text-muted-foreground">{t("onboarding.body")}</p>
        </div>
        <Card className="w-full text-left">
          <div className="flex flex-col gap-1 px-6 pt-6">
            <h2 className="text-base font-semibold">{t("onboarding.cardTitle")}</h2>
            <p className="text-[13px] text-muted-foreground">{t("onboarding.cardBody")}</p>
          </div>
          <ol className="flex flex-col gap-5 p-6">
            <li className="flex items-center justify-between gap-4">
              <Step n={1} title={t("onboarding.step1")} body={t("onboarding.step1Body")} />
              <a
                href="/descargas/reproductor"
                className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 font-mono text-sm font-medium hover:bg-secondary"
              >
                {t("onboarding.download")}
              </a>
            </li>
            <li className="flex items-center justify-between gap-4">
              <Step n={2} title={t("onboarding.step2")} body={t("onboarding.step2Body")} />
              <CodeInput
                label={t("onboarding.step2")}
                value={code}
                onChange={setCode}
                error={unavailable ?? undefined}
                success={!!availability?.available}
              />
            </li>
            {availability?.available || unavailable ? (
              <li
                className={cn(
                  "-mt-2 flex items-center gap-1.5 pl-10 text-[13px]",
                  availability?.available ? "text-success-foreground" : "text-warning-foreground"
                )}
                role="status"
              >
                <Icon
                  name={availability?.available ? "checkCircle" : "warning"}
                  className="size-4"
                />
                {availability?.available ? t("onboarding.found") : unavailable}
              </li>
            ) : null}
          </ol>
          {check.error ? (
            <div className="px-6">
              <Alert tone="error">{errorMessage(check.error, t)}</Alert>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4 p-6">
            <Link
              to="/pantallas/nueva"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("onboarding.skip")}
            </Link>
            <Button onClick={next} disabled={!availability?.available}>
              {t("onboarding.submit")}
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
