-- CreateTable
CREATE TABLE "RedEnvelope" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "amountPi" DECIMAL(18,6) NOT NULL,
    "u2aPaymentId" TEXT,
    "u2aTxid" TEXT,
    "u2aStatus" TEXT NOT NULL DEFAULT 'pending',
    "a2uPaymentId" TEXT,
    "a2uTxid" TEXT,
    "a2uStatus" TEXT NOT NULL DEFAULT 'none',
    "claimedByUserId" TEXT,
    "claimedByUid" TEXT,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "RedEnvelope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RedEnvelope_code_key" ON "RedEnvelope"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RedEnvelope_a2uPaymentId_key" ON "RedEnvelope"("a2uPaymentId");

-- CreateIndex
CREATE INDEX "RedEnvelope_creatorUserId_idx" ON "RedEnvelope"("creatorUserId");

-- CreateIndex
CREATE INDEX "RedEnvelope_code_idx" ON "RedEnvelope"("code");

-- CreateIndex
CREATE INDEX "RedEnvelope_status_idx" ON "RedEnvelope"("status");

-- AddForeignKey
ALTER TABLE "RedEnvelope" ADD CONSTRAINT "RedEnvelope_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "PiUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedEnvelope" ADD CONSTRAINT "RedEnvelope_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "PiUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
