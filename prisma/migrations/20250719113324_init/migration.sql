-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DatabaseType" AS ENUM ('POSTGRESQL', 'MYSQL', 'MONGODB');

-- CreateEnum
CREATE TYPE "OrmType" AS ENUM ('PRISMA', 'MONGOSE', 'DRIZZLE');

-- CreateEnum
CREATE TYPE "FrameworkType" AS ENUM ('EXPRESS', 'NEXTJS');

-- CreateEnum
CREATE TYPE "LanguageType" AS ENUM ('JAVASCRIPT', 'TYPESCRIPT');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD');

-- CreateEnum
CREATE TYPE "CommandCategory" AS ENUM ('SETUP', 'INSTALL', 'CONFIGURE', 'MIGRATE', 'START', 'TEST', 'DEPLOY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_requests" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "databaseType" "DatabaseType",
    "ormType" "OrmType",
    "frameworkType" "FrameworkType",
    "languageType" "LanguageType",

    CONSTRAINT "api_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_apis" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_apis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "database_schemas" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "migrations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setup_commands" (
    "id" TEXT NOT NULL,
    "apiRequestId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "command" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CommandCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setup_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "database_schemas_apiRequestId_key" ON "database_schemas"("apiRequestId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_apis" ADD CONSTRAINT "generated_apis_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "database_schemas" ADD CONSTRAINT "database_schemas_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setup_commands" ADD CONSTRAINT "setup_commands_apiRequestId_fkey" FOREIGN KEY ("apiRequestId") REFERENCES "api_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
