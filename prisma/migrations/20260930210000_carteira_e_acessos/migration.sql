-- CreateTable
CREATE TABLE "DiarioCarteira" (
    "id" TEXT NOT NULL,
    "empresas" JSONB NOT NULL,
    "buscadoEm" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiarioCarteira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoUsuario" (
    "email" TEXT NOT NULL,
    "ultimoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoUsuario_pkey" PRIMARY KEY ("email")
);
