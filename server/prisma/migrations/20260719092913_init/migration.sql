-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'CONSUMPTION');

-- CreateEnum
CREATE TYPE "MealTime" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DATA_ENTRY');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('KG', 'LITRE', 'COUNT', 'CYLINDER_COUNT', 'METER_READING');

-- CreateEnum
CREATE TYPE "FormField" AS ENUM ('QTY', 'PURCHASE_AMOUNT', 'SEVA_AMOUNT', 'SUPPLIER', 'REMARKS');

-- CreateTable
CREATE TABLE "item_category" (
    "id" SERIAL NOT NULL,
    "nameE" TEXT NOT NULL,
    "nameG" TEXT NOT NULL,
    "nameH" TEXT NOT NULL,

    CONSTRAINT "item_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_form_config" (
    "id" SERIAL NOT NULL,
    "itemCategoryId" INTEGER NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "fields" "FormField"[],

    CONSTRAINT "category_form_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" SERIAL NOT NULL,
    "nameE" TEXT NOT NULL,
    "nameG" TEXT NOT NULL,
    "nameH" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "itemCategoryId" INTEGER NOT NULL,
    "minimumQty" DECIMAL(12,3),
    "openingStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" SERIAL NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "itemId" INTEGER NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "purchaseAmount" DECIMAL(12,2),
    "sevaAmount" DECIMAL(12,2),
    "supplier" TEXT,
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhojanshala" (
    "id" SERIAL NOT NULL,
    "nameE" TEXT NOT NULL,
    "nameG" TEXT NOT NULL,
    "nameH" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bhojanshala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhojanshala_count" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "bhojanshalaId" INTEGER NOT NULL,
    "mealTime" "MealTime" NOT NULL,
    "count" INTEGER NOT NULL,
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bhojanshala_count_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish" (
    "id" SERIAL NOT NULL,
    "nameE" TEXT NOT NULL,
    "nameG" TEXT NOT NULL,
    "nameH" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "mealTime" "MealTime" NOT NULL,
    "bhojanshalaId" INTEGER NOT NULL,
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_dish" (
    "menuId" INTEGER NOT NULL,
    "dishId" INTEGER NOT NULL,

    CONSTRAINT "menu_dish_pkey" PRIMARY KEY ("menuId","dishId")
);

-- CreateTable
CREATE TABLE "rasoi_seva" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "donorName" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "remarks" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rasoi_seva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rasoi_seva_slot" (
    "id" SERIAL NOT NULL,
    "rasoiSevaId" INTEGER NOT NULL,
    "bhojanshalaId" INTEGER NOT NULL,
    "mealTime" "MealTime" NOT NULL,
    "personCount" INTEGER NOT NULL,

    CONSTRAINT "rasoi_seva_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "monthlySalary" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_transaction" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "monthlySalary" DECIMAL(12,2) NOT NULL,
    "advance" DECIMAL(12,2),
    "remarks" TEXT,
    "paidOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_category" (
    "userId" INTEGER NOT NULL,
    "itemCategoryId" INTEGER NOT NULL,

    CONSTRAINT "user_category_pkey" PRIMARY KEY ("userId","itemCategoryId")
);

-- CreateTable
CREATE TABLE "user_bhojanshala" (
    "userId" INTEGER NOT NULL,
    "bhojanshalaId" INTEGER NOT NULL,

    CONSTRAINT "user_bhojanshala_pkey" PRIMARY KEY ("userId","bhojanshalaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_form_config_itemCategoryId_transactionType_key" ON "category_form_config"("itemCategoryId", "transactionType");

-- CreateIndex
CREATE INDEX "transaction_datetime_idx" ON "transaction"("datetime");

-- CreateIndex
CREATE INDEX "transaction_itemId_transactionType_idx" ON "transaction"("itemId", "transactionType");

-- CreateIndex
CREATE UNIQUE INDEX "bhojanshala_count_date_bhojanshalaId_mealTime_key" ON "bhojanshala_count"("date", "bhojanshalaId", "mealTime");

-- CreateIndex
CREATE UNIQUE INDEX "menu_date_mealTime_bhojanshalaId_key" ON "menu"("date", "mealTime", "bhojanshalaId");

-- CreateIndex
CREATE INDEX "rasoi_seva_date_idx" ON "rasoi_seva"("date");

-- CreateIndex
CREATE UNIQUE INDEX "rasoi_seva_slot_rasoiSevaId_bhojanshalaId_mealTime_key" ON "rasoi_seva_slot"("rasoiSevaId", "bhojanshalaId", "mealTime");

-- CreateIndex
CREATE UNIQUE INDEX "salary_transaction_staffId_year_month_key" ON "salary_transaction"("staffId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- AddForeignKey
ALTER TABLE "category_form_config" ADD CONSTRAINT "category_form_config_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "item_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "item_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojanshala_count" ADD CONSTRAINT "bhojanshala_count_bhojanshalaId_fkey" FOREIGN KEY ("bhojanshalaId") REFERENCES "bhojanshala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojanshala_count" ADD CONSTRAINT "bhojanshala_count_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_bhojanshalaId_fkey" FOREIGN KEY ("bhojanshalaId") REFERENCES "bhojanshala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_dish" ADD CONSTRAINT "menu_dish_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_dish" ADD CONSTRAINT "menu_dish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rasoi_seva" ADD CONSTRAINT "rasoi_seva_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rasoi_seva_slot" ADD CONSTRAINT "rasoi_seva_slot_rasoiSevaId_fkey" FOREIGN KEY ("rasoiSevaId") REFERENCES "rasoi_seva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rasoi_seva_slot" ADD CONSTRAINT "rasoi_seva_slot_bhojanshalaId_fkey" FOREIGN KEY ("bhojanshalaId") REFERENCES "bhojanshala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_transaction" ADD CONSTRAINT "salary_transaction_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category" ADD CONSTRAINT "user_category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_category" ADD CONSTRAINT "user_category_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "item_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bhojanshala" ADD CONSTRAINT "user_bhojanshala_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bhojanshala" ADD CONSTRAINT "user_bhojanshala_bhojanshalaId_fkey" FOREIGN KEY ("bhojanshalaId") REFERENCES "bhojanshala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
