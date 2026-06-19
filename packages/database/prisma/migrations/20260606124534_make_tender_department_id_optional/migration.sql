-- DropForeignKey
ALTER TABLE "tenders" DROP CONSTRAINT "tenders_departmentId_fkey";

-- AlterTable
ALTER TABLE "tenders" ALTER COLUMN "departmentId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
