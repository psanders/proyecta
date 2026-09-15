/**
 * Copyright (C) 2026 by Proyecta. All rights reserved.
 */
import { useEffect, useState } from "react";
import { LanguageSelect } from "../../components/LanguageSelect.js";
import { PageHeader } from "../../components/PageHeader.js";
import { ThemeSwitch } from "../../components/ThemeSwitch.js";
import { Alert } from "../../components/ui/Alert.js";
import { Button } from "../../components/ui/Button.js";
import { SectionCard } from "../../components/ui/Card.js";
import { TextField } from "../../components/ui/Field.js";
import { SettingRow } from "../../components/ui/SettingRow.js";
import { errorMessage, fieldErrors } from "../../lib/errors.js";
import type { Language } from "../../lib/i18n.js";
import { trpc } from "../../lib/trpc.js";
import { useI18n } from "../../lib/useI18n.js";

export function ProfilePage() {
  const { t, language, setLanguage } = useI18n();
  const utils = trpc.useUtils();
  const profile = trpc.profile.get.useQuery();
  const [name, setName] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  useEffect(() => setName(profile.data?.name ?? ""), [profile.data?.name]);

  const updateName = trpc.profile.updateName.useMutation({
    onSuccess: () => void utils.profile.get.invalidate()
  });
  const changePassword = trpc.profile.changePassword.useMutation({
    onSuccess: () => setPasswords({ currentPassword: "", newPassword: "" })
  });
  // The language applies at once; the cached profile is updated first so usePreferenceSync
  // doesn't switch back while the save is in flight. A failed save restores the saved language.
  const updateLanguage = trpc.profile.updateLanguage.useMutation({
    onSettled: () => void utils.profile.get.invalidate()
  });
  const changeLanguage = (next: Language) => {
    utils.profile.get.setData(undefined, (prev) => (prev ? { ...prev, language: next } : prev));
    setLanguage(next);
    updateLanguage.mutate({ language: next });
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
      <SectionCard title={t("profile.personal")}>
        {updateName.isSuccess ? <Alert tone="success">{t("profile.saved")}</Alert> : null}
        <TextField
          label={t("profile.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors(updateName.error).name}
        />
        <TextField label={t("profile.email")} value={profile.data?.email ?? ""} disabled readOnly />
        <div className="flex justify-end">
          <Button loading={updateName.isPending} onClick={() => updateName.mutate({ name })}>
            {t("profile.saveName")}
          </Button>
        </div>
      </SectionCard>
      <SectionCard title={t("profile.password")}>
        {changePassword.isSuccess ? <Alert tone="success">{t("profile.saved")}</Alert> : null}
        {errorMessage(changePassword.error, t) ? (
          <Alert tone="error">{errorMessage(changePassword.error, t)}</Alert>
        ) : null}
        <TextField
          label={t("profile.current")}
          type="password"
          autoComplete="current-password"
          value={passwords.currentPassword}
          onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          error={fieldErrors(changePassword.error).currentPassword}
        />
        <TextField
          label={t("profile.newPassword")}
          type="password"
          autoComplete="new-password"
          hint={t("signUp.passwordHint")}
          value={passwords.newPassword}
          onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          error={fieldErrors(changePassword.error).newPassword}
        />
        <div className="flex justify-end">
          <Button
            loading={changePassword.isPending}
            onClick={() => changePassword.mutate(passwords)}
          >
            {t("profile.changePassword")}
          </Button>
        </div>
      </SectionCard>
      <SectionCard title={t("profile.preferences")} hint={t("profile.preferencesHint")}>
        {errorMessage(updateLanguage.error, t) ? (
          <Alert tone="error">{errorMessage(updateLanguage.error, t)}</Alert>
        ) : null}
        <div className="flex flex-col">
          <SettingRow label={t("profile.language")} hint={t("profile.languageHint")}>
            {(ids) => <LanguageSelect value={language} onChange={changeLanguage} {...ids} />}
          </SettingRow>
          <SettingRow label={t("profile.appearance")} hint={t("profile.appearanceHint")}>
            {() => <ThemeSwitch />}
          </SettingRow>
        </div>
      </SectionCard>
    </div>
  );
}
