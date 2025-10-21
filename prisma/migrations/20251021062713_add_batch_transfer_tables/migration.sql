-- CreateTable
CREATE TABLE "BatchTransferTask" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "userPaymentId" TEXT NOT NULL,
    "userTxid" TEXT,
    "totalAmount" DECIMAL(18,6) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BatchTransferTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "A2UPayment" (
    "id" TEXT NOT NULL,
    "batchTaskId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "toAddress" VARCHAR(56) NOT NULL,
    "recipientUid" TEXT,
    "amount" DECIMAL(18,6) NOT NULL,
    "memo" TEXT NOT NULL,
    "txid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "A2UPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchTransferTask_batchId_key" ON "BatchTransferTask"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "A2UPayment_paymentId_key" ON "A2UPayment"("paymentId");

-- CreateIndex
CREATE INDEX "A2UPayment_batchTaskId_idx" ON "A2UPayment"("batchTaskId");

-- CreateIndex
CREATE INDEX "A2UPayment_status_idx" ON "A2UPayment"("status");

-- AddForeignKey
ALTER TABLE "A2UPayment" ADD CONSTRAINT "A2UPayment_batchTaskId_fkey" FOREIGN KEY ("batchTaskId") REFERENCES "BatchTransferTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
