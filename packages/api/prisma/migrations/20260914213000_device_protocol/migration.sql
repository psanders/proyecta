-- CreateEnum
CREATE TYPE "place_type" AS ENUM ('BILLBOARD', 'MALL', 'RESTAURANT', 'SUPERMARKET', 'HEALTH', 'TRANSIT', 'GYM', 'OFFICE', 'EDUCATION', 'HOTEL', 'OTHER');

-- CreateEnum
CREATE TYPE "environment" AS ENUM ('INDOOR', 'OUTDOOR');

-- CreateEnum
CREATE TYPE "orientation" AS ENUM ('LANDSCAPE', 'PORTRAIT');

-- CreateEnum
CREATE TYPE "price_model" AS ENUM ('PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH');

-- CreateEnum
CREATE TYPE "screen_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "play_result" AS ENUM ('COMPLETED', 'STALLED', 'FAILED');

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "health" JSONB,
ADD COLUMN     "last_heartbeat_at" TIMESTAMP(3),
ADD COLUMN     "token_hash" TEXT;

-- CreateTable
CREATE TABLE "screens" (
    "id" UUID NOT NULL,
    "workspace_access_key_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place_type" "place_type",
    "environment" "environment",
    "city" TEXT NOT NULL,
    "address" TEXT,
    "width_cm" INTEGER,
    "height_cm" INTEGER,
    "orientation" "orientation",
    "resolution" TEXT,
    "available_days" INTEGER[],
    "start_time" TEXT,
    "end_time" TEXT,
    "price_reference" INTEGER,
    "price_model" "price_model",
    "status" "screen_status" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_bindings" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "screen_id" UUID NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinked_at" TIMESTAMP(3),

    CONSTRAINT "device_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_logs" (
    "id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "screen_id" UUID,
    "item_id" TEXT NOT NULL,
    "codec" TEXT NOT NULL,
    "result" "play_result" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "screens_workspace_access_key_id_status_idx" ON "screens"("workspace_access_key_id", "status");

-- CreateIndex
CREATE INDEX "device_bindings_device_id_linked_at_idx" ON "device_bindings"("device_id", "linked_at");

-- CreateIndex
CREATE INDEX "device_bindings_screen_id_linked_at_idx" ON "device_bindings"("screen_id", "linked_at");

-- CreateIndex
CREATE INDEX "play_logs_screen_id_started_at_idx" ON "play_logs"("screen_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "play_logs_device_id_item_id_started_at_key" ON "play_logs"("device_id", "item_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "devices_token_hash_key" ON "devices"("token_hash");

-- AddForeignKey
ALTER TABLE "device_bindings" ADD CONSTRAINT "device_bindings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_bindings" ADD CONSTRAINT "device_bindings_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_logs" ADD CONSTRAINT "play_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_logs" ADD CONSTRAINT "play_logs_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- At most one open link per device and per screen. Linking races resolve here: exactly one wins.
CREATE UNIQUE INDEX "device_bindings_open_device_key" ON "device_bindings" ("device_id") WHERE "unlinked_at" IS NULL;
CREATE UNIQUE INDEX "device_bindings_open_screen_key" ON "device_bindings" ("screen_id") WHERE "unlinked_at" IS NULL;
