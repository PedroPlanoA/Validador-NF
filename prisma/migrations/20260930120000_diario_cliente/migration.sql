-- CreateTable
CREATE TABLE "DiarioConfig" (
    "id" TEXT NOT NULL,
    "campos" JSONB NOT NULL,
    "departamentos" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiarioConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiarioCliente" (
    "chave" TEXT NOT NULL,
    "blocos" JSONB NOT NULL,
    "alertas" INTEGER NOT NULL DEFAULT 0,
    "totalBlocos" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiarioCliente_pkey" PRIMARY KEY ("chave")
);
