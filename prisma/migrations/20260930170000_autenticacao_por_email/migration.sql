-- CreateTable
CREATE TABLE "UsuarioAutorizado" (
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "criadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioAutorizado_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "CodigoAcesso" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodigoAcesso_email_idx" ON "CodigoAcesso"("email");
