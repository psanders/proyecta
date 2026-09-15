-- CreateTable
CREATE TABLE "workspace_settings" (
    "workspace_access_key_id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Santo_Domingo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("workspace_access_key_id")
);

