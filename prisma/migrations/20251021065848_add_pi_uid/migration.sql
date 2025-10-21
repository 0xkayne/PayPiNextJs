/*
  Warnings:

  - A unique constraint covering the columns `[piUid]` on the table `PiUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PiUser" ADD COLUMN     "piUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PiUser_piUid_key" ON "PiUser"("piUid");
