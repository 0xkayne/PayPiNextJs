-- CreateTable
CREATE TABLE "PiUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PiUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantPaycode" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "piAddress" VARCHAR(56) NOT NULL,
    "startPi" DECIMAL(18,6) NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "qrPngDataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantPaycode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PiUser_username_key" ON "PiUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantPaycode_ownerUserId_key" ON "MerchantPaycode"("ownerUserId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PiUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPaycode" ADD CONSTRAINT "MerchantPaycode_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "PiUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
