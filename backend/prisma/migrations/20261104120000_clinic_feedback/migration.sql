-- AlterTable
ALTER TABLE "Visit" ADD COLUMN "doctorMedChange" TEXT;
ALTER TABLE "Visit" ADD COLUMN "doctorMedChangeDetail" TEXT;
ALTER TABLE "Visit" ADD COLUMN "urgencyColor" TEXT;
ALTER TABLE "Visit" ADD COLUMN "nextSeePharmacist" TEXT;

-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN "valueText" TEXT;
