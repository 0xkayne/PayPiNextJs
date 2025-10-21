-- AlterTable
ALTER TABLE "MerchantPaycode" ADD COLUMN     "dividendPool" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "initialAmount" DECIMAL(18,6) NOT NULL DEFAULT 0,
ADD COLUMN     "merchantUid" VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN     "registerPaymentId" TEXT,
ADD COLUMN     "registerTxid" TEXT,
ALTER COLUMN "piAddress" DROP NOT NULL,
ALTER COLUMN "startPi" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MerchantPayment" (
    "id" TEXT NOT NULL,
    "merchantPaycodeId" TEXT NOT NULL,
    "payerUserId" TEXT,
    "payerUid" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,6) NOT NULL,
    "merchantAmount" DECIMAL(18,6) NOT NULL,
    "dividendAmount" DECIMAL(18,6) NOT NULL,
    "u2aPaymentId" TEXT NOT NULL,
    "u2aTxid" TEXT,
    "a2uPaymentId" TEXT,
    "a2uTxid" TEXT,
    "a2uStatus" TEXT NOT NULL DEFAULT 'pending',
    "a2uErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MerchantPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantDividendDistribution" (
    "id" TEXT NOT NULL,
    "merchantPaycodeId" TEXT NOT NULL,
    "totalDividend" DECIMAL(18,6) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MerchantDividendDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantDividendPayment" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientUid" TEXT NOT NULL,
    "totalPaidAmount" DECIMAL(18,6) NOT NULL,
    "percentage" DECIMAL(5,4) NOT NULL,
    "dividendAmount" DECIMAL(18,6) NOT NULL,
    "paymentId" TEXT,
    "txid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MerchantDividendPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPayment_a2uPaymentId_key" ON "MerchantPayment"("a2uPaymentId");

-- CreateIndex
CREATE INDEX "MerchantPayment_merchantPaycodeId_idx" ON "MerchantPayment"("merchantPaycodeId");

-- CreateIndex
CREATE INDEX "MerchantPayment_payerUserId_idx" ON "MerchantPayment"("payerUserId");

-- CreateIndex
CREATE INDEX "MerchantPayment_payerUid_idx" ON "MerchantPayment"("payerUid");

-- CreateIndex
CREATE INDEX "MerchantDividendDistribution_merchantPaycodeId_idx" ON "MerchantDividendDistribution"("merchantPaycodeId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantDividendPayment_paymentId_key" ON "MerchantDividendPayment"("paymentId");

-- CreateIndex
CREATE INDEX "MerchantDividendPayment_distributionId_idx" ON "MerchantDividendPayment"("distributionId");

-- CreateIndex
CREATE INDEX "MerchantDividendPayment_recipientUid_idx" ON "MerchantDividendPayment"("recipientUid");

-- AddForeignKey
ALTER TABLE "MerchantPayment" ADD CONSTRAINT "MerchantPayment_merchantPaycodeId_fkey" FOREIGN KEY ("merchantPaycodeId") REFERENCES "MerchantPaycode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayment" ADD CONSTRAINT "MerchantPayment_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "PiUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDividendDistribution" ADD CONSTRAINT "MerchantDividendDistribution_merchantPaycodeId_fkey" FOREIGN KEY ("merchantPaycodeId") REFERENCES "MerchantPaycode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDividendPayment" ADD CONSTRAINT "MerchantDividendPayment_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "MerchantDividendDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantDividendPayment" ADD CONSTRAINT "MerchantDividendPayment_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "PiUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
