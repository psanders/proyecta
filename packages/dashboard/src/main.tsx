/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { StrictMode, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createClient, trpc } from "./lib/trpc.js";
import { useSession } from "./lib/useSession.js";
import { AppLayout } from "./routes/AppLayout.js";
import {
  AcceptInvitationPage,
  ForgotPasswordPage,
  InvitationInvalidPage,
  ResetPasswordPage,
  SignInPage,
  SignUpPage
} from "./routes/auth/AuthPages.js";
import { ProfilePage } from "./routes/profile/ProfilePage.js";
import { OnboardingPage } from "./routes/screens/OnboardingPage.js";
import { SettingsPage } from "./routes/settings/SettingsPage.js";
import { ScreenDetailPage } from "./routes/screens/ScreenDetailPage.js";
import { ScreenFormPage } from "./routes/screens/ScreenFormPage.js";
import { ScreensPage } from "./routes/screens/ScreensPage.js";
import { TeamPage } from "./routes/team/TeamPage.js";
import "./index.css";

/** Full-page routes that still require a session (onboarding has no sidebar in Pencil). */
function RequireSession({ children }: { children: ReactNode }) {
  const current = useSession();
  const location = useLocation();
  return current ? (
    children
  ) : (
    <Navigate to={`/ingresar?volver=${encodeURIComponent(location.pathname)}`} replace />
  );
}

const router = createBrowserRouter([
  { path: "/ingresar", element: <SignInPage /> },
  { path: "/crear-cuenta", element: <SignUpPage /> },
  { path: "/recuperar", element: <ForgotPasswordPage /> },
  { path: "/restablecer", element: <ResetPasswordPage /> },
  { path: "/invitacion", element: <AcceptInvitationPage /> },
  { path: "/invitacion-invalida", element: <InvitationInvalidPage /> },
  {
    path: "/bienvenida",
    element: (
      <RequireSession>
        <OnboardingPage />
      </RequireSession>
    )
  },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <ScreensPage /> },
      { path: "pantallas/nueva", element: <ScreenFormPage /> },
      { path: "pantallas/:id", element: <ScreenDetailPage /> },
      { path: "pantallas/:id/editar", element: <ScreenFormPage /> },
      { path: "equipo", element: <TeamPage /> },
      { path: "perfil", element: <ProfilePage /> },
      { path: "configuracion", element: <SettingsPage /> }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

function Root() {
  const [queryClient] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
  );
  const [trpcClient] = useState(createClient);
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
