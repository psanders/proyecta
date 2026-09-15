/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../../components/AuthLayout.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { TextField } from "../../components/ui/Field.js";
import { Icon } from "../../components/ui/Icon.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import { session } from "../../lib/session.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

/** Only same-app paths are allowed as return targets. */
function safeReturn(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function SignInPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = trpc.auth.signIn.useMutation({
    onSuccess(tokens) {
      session.set({ ...tokens, workspace: null });
      void utils.invalidate();
      navigate(safeReturn(params.get("returnTo")), { replace: true });
    }
  });
  const errors = fieldErrors(signIn.error);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signIn.mutate({ email, password });
  };

  return (
    <AuthLayout title={t("signIn.title")} subtitle={t("signIn.subtitle")}>
      <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
        {errorMessage(signIn.error, t) ? (
          <Alert tone="error">{errorMessage(signIn.error, t)}</Alert>
        ) : null}
        <div className="flex flex-col gap-4">
          <TextField
            label={t("signIn.email")}
            type="email"
            autoComplete="email"
            placeholder={t("signIn.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <TextField
            label={t("signIn.password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </div>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            {t("signIn.forgot")}
          </Link>
        </div>
        <Button type="submit" loading={signIn.isPending} className="w-full">
          {t("signIn.submit")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("signIn.noAccount")}{" "}
          <Link to="/sign-up" className="font-medium text-primary">
            {t("signIn.createAccount")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function SignUpPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", businessName: "", email: "", password: "" });
  const signUp = trpc.auth.signUp.useMutation({
    onSuccess(result) {
      session.set({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        workspace: result.workspace.accessKeyId
      });
      void utils.invalidate();
      navigate("/welcome", { replace: true });
    }
  });
  const errors = fieldErrors(signUp.error);
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
    error: errors[key]
  });

  return (
    <AuthLayout title={t("signUp.title")} subtitle={t("signUp.subtitle")}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          signUp.mutate(form);
        }}
      >
        {errorMessage(signUp.error, t) ? (
          <Alert tone="error">{errorMessage(signUp.error, t)}</Alert>
        ) : null}
        <div className="flex flex-col gap-4">
          <TextField
            label={t("signUp.name")}
            autoComplete="name"
            placeholder={t("signUp.namePlaceholder")}
            {...bind("name")}
          />
          <TextField
            label={t("signUp.business")}
            autoComplete="organization"
            placeholder={t("signUp.businessPlaceholder")}
            {...bind("businessName")}
          />
          <TextField
            label={t("signIn.email")}
            type="email"
            autoComplete="email"
            placeholder={t("signIn.emailPlaceholder")}
            {...bind("email")}
          />
          <TextField
            label={t("signIn.password")}
            type="password"
            autoComplete="new-password"
            hint={t("signUp.passwordHint")}
            {...bind("password")}
          />
        </div>
        <Button type="submit" loading={signUp.isPending} className="w-full">
          {t("signUp.submit")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("signUp.haveAccount")}{" "}
          <Link to="/sign-in" className="font-medium text-primary">
            {t("signUp.signIn")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const request = trpc.auth.requestPasswordReset.useMutation();
  const errors = fieldErrors(request.error);
  return (
    <AuthLayout title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
      {request.isSuccess ? (
        <Alert tone="success">{t("forgot.sent")}</Alert>
      ) : (
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            request.mutate({ email });
          }}
        >
          <TextField
            label={t("signIn.email")}
            type="email"
            autoComplete="email"
            placeholder={t("signIn.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Button type="submit" loading={request.isPending} className="w-full">
            {t("forgot.submit")}
          </Button>
        </form>
      )}
      <Link to="/sign-in" className="text-center text-sm font-medium text-primary">
        {t("forgot.back")}
      </Link>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const reset = trpc.auth.resetPassword.useMutation();
  const errors = fieldErrors(reset.error);
  return (
    <AuthLayout title={t("reset.title")} subtitle={t("reset.subtitle")}>
      {reset.isSuccess ? (
        <>
          <Alert tone="success">{t("reset.done")}</Alert>
          <Link to="/sign-in" className="text-center text-sm font-medium text-primary">
            {t("invitation.goSignIn")}
          </Link>
        </>
      ) : (
        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setMismatch(password !== confirm);
            if (password === confirm) reset.mutate({ token: params.get("token") ?? "", password });
          }}
        >
          {errorMessage(reset.error, t) ? (
            <Alert tone="error">{errorMessage(reset.error, t)}</Alert>
          ) : null}
          <TextField
            label={t("reset.password")}
            type="password"
            autoComplete="new-password"
            hint={t("signUp.passwordHint")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <TextField
            label={t("reset.confirm")}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? t("reset.mismatch") : undefined}
          />
          <Button type="submit" loading={reset.isPending} className="w-full">
            {t("reset.submit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function AcceptInvitationPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const accept = trpc.workspaces.acceptInvitation.useMutation();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    accept.mutate({ token: params.get("token") ?? "" });
  }, [accept, params]);

  if (accept.isError) return <InvitationInvalidPage />;
  return (
    <AuthLayout
      title={accept.isSuccess ? t("invitation.acceptedTitle") : t("invitation.accepting")}
      subtitle={accept.isSuccess ? t("invitation.acceptedBody") : ""}
    >
      {accept.isSuccess ? (
        <Link
          to="/sign-in"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary font-mono text-sm font-medium text-primary-foreground"
        >
          {t("invitation.goSignIn")}
        </Link>
      ) : (
        <Icon name="spinner" className="size-6 animate-spin text-muted-foreground" />
      )}
    </AuthLayout>
  );
}

export function InvitationInvalidPage() {
  const { t } = useI18n();
  return (
    <AuthLayout title={t("invitation.invalidTitle")} subtitle={t("invitation.invalidBody")}>
      <Link
        to="/sign-in"
        className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card font-mono text-sm font-medium"
      >
        {t("invitation.goSignIn")}
      </Link>
    </AuthLayout>
  );
}
