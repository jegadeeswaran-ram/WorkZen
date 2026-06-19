/*
  Warnings:

  - The `approverRole` column on the `workflow_steps` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `name` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "roles" DROP COLUMN "name",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workflow_steps" DROP COLUMN "approverRole",
ADD COLUMN     "approverRole" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenantId_name_key" ON "roles"("tenantId", "name");
