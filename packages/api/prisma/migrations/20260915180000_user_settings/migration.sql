-- CreateTable
CREATE TABLE "user_settings" (
    "user_ref" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_ref")
);
