-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('MAIN', 'DEV');

-- CreateTable
CREATE TABLE "generated_files" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencies" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_variables" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "environment_variables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generated_files_apiRequestId_filename_key" ON "generated_files"("apiRequestId", "filename");

-- CreateIndex
CREATE UNIQUE INDEX "dependencies_apiRequestId_name_type_key" ON "dependencies"("apiRequestId", "name", "type");

-- CreateIndex
CREATE UNIQUE INDEX "environment_variables_apiRequestId_key_key" ON "environment_variables"("apiRequestId", "key");

-- AddForeignKey
ALTER TABLE "generated_files" ADD CONSTRAINT "generated_files_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
