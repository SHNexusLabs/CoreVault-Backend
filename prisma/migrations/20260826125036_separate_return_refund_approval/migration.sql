/*
  Warnings:

  - You are about to drop the column `approved_at` on the `return_requests` table. All the data in the column will be lost.
  - You are about to drop the column `approved_by_id` on the `return_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "return_requests" DROP CONSTRAINT "return_requests_approved_by_id_fkey";

-- AlterTable
ALTER TABLE "return_requests" DROP COLUMN "approved_at",
DROP COLUMN "approved_by_id",
ADD COLUMN     "refund_approved_at" TIMESTAMP(3),
ADD COLUMN     "refund_approved_by_id" TEXT,
ADD COLUMN     "return_approved_at" TIMESTAMP(3),
ADD COLUMN     "return_approved_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_return_approved_by_id_fkey" FOREIGN KEY ("return_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_refund_approved_by_id_fkey" FOREIGN KEY ("refund_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
