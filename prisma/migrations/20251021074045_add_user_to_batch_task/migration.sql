-- AlterTable
ALTER TABLE "BatchTransferTask" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "BatchTransferTask_userId_idx" ON "BatchTransferTask"("userId");

-- AddForeignKey
ALTER TABLE "BatchTransferTask" ADD CONSTRAINT "BatchTransferTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PiUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
