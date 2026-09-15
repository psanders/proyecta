-- CreateEnum
CREATE TYPE "review_reason" AS ENUM ('INAPPROPRIATE_CONTENT', 'COMPETITOR', 'NOT_SUITABLE_FOR_VENUE', 'LOW_QUALITY', 'OTHER');

-- AlterTable
ALTER TABLE "ad_placements" ADD COLUMN     "decided_by_user_ref" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "reason_code" "review_reason";
