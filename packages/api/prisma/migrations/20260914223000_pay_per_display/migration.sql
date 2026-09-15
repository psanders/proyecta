-- AlterTable
ALTER TABLE "play_logs" ADD COLUMN     "billed_units" INTEGER,
ADD COLUMN     "rate_cents_at_play" INTEGER;

-- AlterTable
ALTER TABLE "screens" DROP COLUMN "price_model",
DROP COLUMN "price_reference",
ADD COLUMN     "rate_per_five_seconds_cents" INTEGER;

-- DropEnum
DROP TYPE "price_model";

-- CreateIndex
CREATE INDEX "play_logs_screen_id_result_started_at_idx" ON "play_logs"("screen_id", "result", "started_at");

