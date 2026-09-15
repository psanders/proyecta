-- CreateEnum
CREATE TYPE "dashboard_view" AS ENUM ('SCREEN_OWNER', 'ADVERTISER', 'BOTH');

-- CreateEnum
CREATE TYPE "asset_kind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ad_state" AS ENUM ('SUBMITTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "placement_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "play_logs" ADD COLUMN     "advertiser_workspace_access_key_id" TEXT,
ADD COLUMN     "house" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placement_id" UUID;

-- AlterTable
ALTER TABLE "workspace_settings" ADD COLUMN     "dashboard_view" "dashboard_view" NOT NULL DEFAULT 'SCREEN_OWNER';

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "workspace_access_key_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "asset_kind" NOT NULL,
    "status" "asset_status" NOT NULL DEFAULT 'PROCESSING',
    "duration_ms" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "orientation" "orientation" NOT NULL,
    "source_file" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "renditions" JSONB NOT NULL DEFAULT '{}',
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads" (
    "id" UUID NOT NULL,
    "workspace_access_key_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advertiser_name" TEXT NOT NULL,
    "asset_id" UUID NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "state" "ad_state" NOT NULL DEFAULT 'SUBMITTED',
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_placements" (
    "id" UUID NOT NULL,
    "ad_id" UUID NOT NULL,
    "screen_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "status" "placement_status" NOT NULL,
    "decided_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assets_workspace_access_key_id_created_at_idx" ON "assets"("workspace_access_key_id", "created_at");

-- CreateIndex
CREATE INDEX "ads_workspace_access_key_id_created_at_idx" ON "ads"("workspace_access_key_id", "created_at");

-- CreateIndex
CREATE INDEX "ads_state_starts_at_ends_at_idx" ON "ads"("state", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "ad_placements_ad_id_screen_id_idx" ON "ad_placements"("ad_id", "screen_id");

-- CreateIndex
CREATE INDEX "ad_placements_screen_id_status_idx" ON "ad_placements"("screen_id", "status");

-- CreateIndex
CREATE INDEX "play_logs_placement_id_result_idx" ON "play_logs"("placement_id", "result");

-- AddForeignKey
ALTER TABLE "play_logs" ADD CONSTRAINT "play_logs_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "ad_placements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads" ADD CONSTRAINT "ads_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "ads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
