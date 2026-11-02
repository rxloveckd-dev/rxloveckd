-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nationalId" TEXT NOT NULL,
    "hn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATETIME NOT NULL,
    "sex" TEXT NOT NULL,
    "ckdCause" TEXT,
    "programStatus" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" DATETIME NOT NULL,
    "notes" TEXT,
    "responsiblePharmacistId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Patient_responsiblePharmacistId_fkey" FOREIGN KEY ("responsiblePharmacistId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "visitNo" INTEGER NOT NULL,
    "visitDate" DATETIME NOT NULL,
    "medicationTaking" TEXT NOT NULL,
    "herbalOrPainkiller" BOOLEAN NOT NULL,
    "herbalDetail" TEXT,
    "dietControlled" BOOLEAN NOT NULL,
    "seasoning" TEXT NOT NULL,
    "furtherAdjustments" TEXT,
    "nextAppointment" DATETIME,
    "pharmacistId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visit_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "test" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "collectedAt" DATETIME NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'user_entered',
    "source" TEXT NOT NULL DEFAULT 'บันทึกเอง',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LabResult_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "drugName" TEXT NOT NULL,
    "strength" TEXT,
    "directions" TEXT,
    "drugClass" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Medication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Medication_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Drp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "drugs" TEXT,
    "severity" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "prescriberDecision" TEXT NOT NULL DEFAULT 'pending',
    "prescriberReason" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "pharmacistId" TEXT NOT NULL,
    CONSTRAINT "Drp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Drp_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Drp_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "rationale" TEXT NOT NULL,
    "reviewer" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "values" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "outcome" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_nationalId_key" ON "Patient"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_hn_key" ON "Patient"("hn");

-- CreateIndex
CREATE INDEX "Patient_lastName_idx" ON "Patient"("lastName");

-- CreateIndex
CREATE INDEX "Visit_visitDate_idx" ON "Visit"("visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_patientId_visitNo_key" ON "Visit"("patientId", "visitNo");

-- CreateIndex
CREATE INDEX "LabResult_patientId_test_collectedAt_idx" ON "LabResult"("patientId", "test", "collectedAt");

-- CreateIndex
CREATE INDEX "Medication_patientId_status_idx" ON "Medication"("patientId", "status");

-- CreateIndex
CREATE INDEX "Drp_patientId_idx" ON "Drp"("patientId");

-- CreateIndex
CREATE INDEX "Drp_recordedAt_idx" ON "Drp"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RuleVersion_version_key" ON "RuleVersion"("version");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");
