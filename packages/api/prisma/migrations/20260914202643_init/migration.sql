-- CreateEnum
CREATE TYPE "device_shell" AS ENUM ('ANDROID', 'KIOSK_LINUX', 'KIOSK_WINDOWS', 'BROWSER');

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "code" CHAR(8) NOT NULL,
    "hw_id" TEXT NOT NULL,
    "shell" "device_shell" NOT NULL,
    "chromium_version" TEXT,
    "resolution" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_code_key" ON "devices"("code");

-- CreateIndex
CREATE UNIQUE INDEX "devices_hw_id_key" ON "devices"("hw_id");
