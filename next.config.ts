import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A rota que monta o arquivo do ICO lê o modelo .xlsx do disco, e não como
  // asset estático. Sem declarar isso, o rastreamento de arquivos do build
  // não o enxerga (nada o importa) e ele fica de fora do bundle da função.
  outputFileTracingIncludes: {
    "/api/ico-fiscal/arquivo": ["./public/modelos/**"],
  },
};

export default nextConfig;
