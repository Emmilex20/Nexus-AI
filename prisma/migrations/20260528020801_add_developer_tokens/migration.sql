-- CreateTable
CREATE TABLE "DeveloperToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeveloperToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperToken_tokenHash_key" ON "DeveloperToken"("tokenHash");

-- CreateIndex
CREATE INDEX "DeveloperToken_userId_idx" ON "DeveloperToken"("userId");

-- CreateIndex
CREATE INDEX "DeveloperToken_tokenHash_idx" ON "DeveloperToken"("tokenHash");

-- CreateIndex
CREATE INDEX "DeveloperToken_revokedAt_idx" ON "DeveloperToken"("revokedAt");

-- AddForeignKey
ALTER TABLE "DeveloperToken" ADD CONSTRAINT "DeveloperToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
