-- DropForeignKey
ALTER TABLE "bhojanshala_count" DROP CONSTRAINT "bhojanshala_count_createdById_fkey";

-- DropForeignKey
ALTER TABLE "menu" DROP CONSTRAINT "menu_createdById_fkey";

-- DropForeignKey
ALTER TABLE "rasoi_seva" DROP CONSTRAINT "rasoi_seva_createdById_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_createdById_fkey";

-- AlterTable
ALTER TABLE "bhojanshala_count" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "menu" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "rasoi_seva" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "transaction" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojanshala_count" ADD CONSTRAINT "bhojanshala_count_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rasoi_seva" ADD CONSTRAINT "rasoi_seva_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
