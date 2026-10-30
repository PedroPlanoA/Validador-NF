-- CreateTable
CREATE TABLE "IcoArquivo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tri" TEXT,
    "tag" TEXT NOT NULL,
    "detalhe" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IcoArquivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IcoArquivo_nome_key" ON "IcoArquivo"("nome");

-- CreateIndex
CREATE INDEX "IcoArquivo_tipo_tri_idx" ON "IcoArquivo"("tipo", "tri");
