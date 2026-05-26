-- CreateTable
CREATE TABLE "master_resume_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_resume_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultPriority" INTEGER NOT NULL DEFAULT 50,
    "truthSource" TEXT NOT NULL DEFAULT 'master_resume',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "refId" TEXT,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_offers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'paste',
    "rawText" TEXT NOT NULL,
    "url" TEXT,
    "signals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tailoring_sessions" (
    "id" TEXT NOT NULL,
    "jobOfferId" TEXT NOT NULL,
    "masterResumeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "suggestions" JSONB NOT NULL,
    "approved" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tailoring_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_resumes" (
    "id" TEXT NOT NULL,
    "jobOfferId" TEXT NOT NULL,
    "masterResumeId" TEXT NOT NULL,
    "sessionId" TEXT,
    "filename" TEXT NOT NULL,
    "typstSource" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_blocks_profileId_type_active_idx" ON "content_blocks"("profileId", "type", "active");

-- CreateIndex
CREATE INDEX "content_blocks_profileId_refId_idx" ON "content_blocks"("profileId", "refId");

-- CreateIndex
CREATE INDEX "tailoring_sessions_jobOfferId_idx" ON "tailoring_sessions"("jobOfferId");

-- CreateIndex
CREATE INDEX "tailoring_sessions_masterResumeId_idx" ON "tailoring_sessions"("masterResumeId");

-- CreateIndex
CREATE INDEX "generated_resumes_jobOfferId_idx" ON "generated_resumes"("jobOfferId");

-- CreateIndex
CREATE INDEX "generated_resumes_sessionId_idx" ON "generated_resumes"("sessionId");

-- AddForeignKey
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "master_resume_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_sessions" ADD CONSTRAINT "tailoring_sessions_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tailoring_sessions" ADD CONSTRAINT "tailoring_sessions_masterResumeId_fkey" FOREIGN KEY ("masterResumeId") REFERENCES "master_resume_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_resumes" ADD CONSTRAINT "generated_resumes_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_resumes" ADD CONSTRAINT "generated_resumes_masterResumeId_fkey" FOREIGN KEY ("masterResumeId") REFERENCES "master_resume_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_resumes" ADD CONSTRAINT "generated_resumes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "tailoring_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
