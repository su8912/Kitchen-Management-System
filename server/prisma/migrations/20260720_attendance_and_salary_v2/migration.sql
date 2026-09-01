-- Add AttendanceStatus enum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'HOLIDAY');

-- Modify salary_transaction: add new columns WITH defaults for existing rows,
-- then drop advance column
ALTER TABLE "salary_transaction"
  ADD COLUMN "daysPresent" DECIMAL(5,1) NOT NULL DEFAULT 0,
  ADD COLUMN "perDaySalary" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Populate perDaySalary for existing rows: monthlySalary / 30 (approximation)
UPDATE "salary_transaction" SET "perDaySalary" = "monthlySalary" / 30 WHERE "perDaySalary" = 0;

-- Remove the advance column
ALTER TABLE "salary_transaction" DROP COLUMN "advance";

-- Create staff_attendance table
CREATE TABLE "staff_attendance" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

-- Unique + index on staff_attendance
CREATE UNIQUE INDEX "staff_attendance_staffId_date_key" ON "staff_attendance"("staffId", "date");
CREATE INDEX "staff_attendance_date_idx" ON "staff_attendance"("date");

-- Foreign key
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
