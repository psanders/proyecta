-- AlterTable
ALTER TABLE "screens" ADD COLUMN     "description" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];


-- Coordinates come in pairs and are real WGS84 degrees (the DR bounds are checked by the schema).
ALTER TABLE "screens" ADD CONSTRAINT "screens_coordinates_pair"
  CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
ALTER TABLE "screens" ADD CONSTRAINT "screens_coordinates_range"
  CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);

-- Resolution is the native panel resolution with the larger dimension first.
UPDATE "screens"
SET "resolution" = split_part("resolution", 'x', 2) || 'x' || split_part("resolution", 'x', 1)
WHERE "resolution" ~ '^\d{2,5}x\d{2,5}$'
  AND split_part("resolution", 'x', 2)::int > split_part("resolution", 'x', 1)::int;
