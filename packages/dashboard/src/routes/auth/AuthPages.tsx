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
import { strings } from "../../strings.js";

/** Only same-app paths are allowed as return targets. */
function safeReturn(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function SignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = trpc.auth.signIn.useMutation({
    onSuccess(tokens) {
      session.set({ ...tokens, workspace: null });
      void utils.invalidate();
      navigate(safeReturn(params.get("volver")), { replace: true });
    }
  });
  const errors = fieldErrors(signIn.error);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signIn.mutate({ email, password });
  };

  return (
    <AuthLayout title={strings.signIn.title} subtitle={strings.signIn.subtitle}>
      <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
        {errorMessage(signIn.error) ? (
          <Alert tone="error">{errorMessage(signIn.error)}</Alert>
        ) : null}
        <div className="flex flex-col gap-4">
          <TextField
            label={strings.signIn.email}
            type="email"
            autoComplete="email"
            placeholder={strings.signIn.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <TextField
            label={strings.signIn.password}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        </div>
        <div className="flex justify-end">
          <Link to="/recuperar" className="text-[13px] text-muted-foreground hover:text-foreground">
            {strings.signIn.forgot}
          </Link>
        </div>
        <Button type="submit" loading={signIn.isPending} className="w-full">
          {strings.signIn.submit}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {strings.signIn.noAccount}{" "}
          <Link to="/crear-cuenta" className="font-medium text-primary">
            {strings.signIn.createAccount}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function SignUpPage() {
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
      navigate("/bienvenida", { replace: true });
    }
  });
  const errors = fieldErrors(signUp.error);
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value }),
    error: errors[key]
  });

  return (
    <AuthLayout title={strings.signUp.title} subtitle={strings.signUp.subtitle}>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          signUp.mutate(form);
        }}
      >
        {errorMessage(signUp.error) ? (
          <Alert tone="error">{errorMessage(signUp.error)}</Alert>
        ) : null}
        <div className="flex flex-col gap-4">
          <TextField
            label={strings.signUp.name}
            autoComplete="name"
            placeholder={strings.signUp.namePlaceholder}
            {...bind("name")}
          />
          <TextField
            label={strings.signUp.business}
            autoComplete="organization"
            placeholder={strings.signUp.businessPlaceholder}
            {...bind("businessName")}
          />
          <TextField
            label={strings.signIn.email}
            type="email"
            autoComplete="email"
            placeholder={strings.signIn.emailPlaceholder}
            {...bind("email")}
          />
          <TextField
            label={strings.signIn.password}
            type="password"
            autoComplete="new-password"
            hint={strings.signUp.passwordHint}
            {...bind("password")}
          />
        </div>
        <Button type="submit" loading={signUp.isPending} className="w-full">
          {strings.signUp.submit}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {strings.signUp.haveAccount}{" "}
          <Link to="/ingresar" className="font-medium text-primary">
            {strings.signUp.signIn}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const request = trpc.auth.requestPasswordReset.useMutation();
  const errors = fieldErrors(request.error);
  return (
    <AuthLayout title={strings.forgot.title} subtitle={strings.forgot.subtitle}>
      {request.isSuccess ? (
        <Alert tone="success">{strings.forgot.sent}</Alert>
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
            label={strings.signIn.email}
            type="email"
            autoComplete="email"
            placeholder={strings.signIn.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Button type="submit" loading={request.isPending} className="w-full">
            {strings.forgot.submit}
          </Button>
        </form>
      )}
      <Link to="/ingresar" className="text-center text-sm font-medium text-primary">
        {strings.forgot.back}
      </Link>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const reset = trpc.auth.resetPassword.useMutation();
  const errors = fieldErrors(reset.error);
  return (
    <AuthLayout title={strings.reset.title} subtitle={strings.reset.subtitle}>
      {reset.isSuccess ? (
        <>
          <Alert tone="success">{strings.reset.done}</Alert>
          <Link to="/ingresar" className="text-center text-sm font-medium text-primary">
            {strings.invitation.goSignIn}
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
          {errorMessage(reset.error) ? (
            <Alert tone="error">{errorMessage(reset.error)}</Alert>
          ) : null}
          <TextField
            label={strings.reset.password}
            type="password"
            autoComplete="new-password"
            hint={strings.signUp.passwordHint}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <TextField
            label={strings.reset.confirm}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? strings.reset.mismatch : undefined}
          />
          <Button type="submit" loading={reset.isPending} className="w-full">
            {strings.reset.submit}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function AcceptInvitationPage() {
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
      title={accept.isSuccess ? strings.invitation.acceptedTitle : strings.invitation.accepting}
      subtitle={accept.isSuccess ? strings.invitation.acceptedBody : ""}
    >
      {accept.isSuccess ? (
        <Link
          to="/ingresar"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary font-mono text-sm font-medium text-primary-foreground"
        >
          {strings.invitation.goSignIn}
        </Link>
      ) : (
        <Icon name="spinner" className="size-6 animate-spin text-muted-foreground" />
      )}
    </AuthLayout>
  );
}

export function InvitationInvalidPage() {
  return (
    <AuthLayout title={strings.invitation.invalidTitle} subtitle={strings.invitation.invalidBody}>
      <Link
        to="/ingresar"
        className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-card font-mono text-sm font-medium"
      >
        {strings.invitation.goSignIn}
      </Link>
    </AuthLayout>
  );
}
