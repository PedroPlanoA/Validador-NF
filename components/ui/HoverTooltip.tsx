"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

const OFFSET_X = 14;
const OFFSET_Y = 18;
const TOOLTIP_MAX_WIDTH = 360;

/**
 * Mostra o texto completo de um conteúdo truncado numa janelinha ao lado do
 * cursor.
 *
 * O balão vai para o `document.body` via portal, e não como filho posicionado:
 * a célula vive dentro de um contêiner com `overflow-x-auto`, que recorta
 * qualquer filho absoluto que passe das suas bordas — dentro da tabela o balão
 * simplesmente não apareceria.
 */
export function HoverTooltip({
  text,
  children,
  className = "",
}: {
  text: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function track(e: React.MouseEvent) {
    // Perto da borda direita o balão viraria para fora da tela, então ele passa
    // a ser desenhado à esquerda do cursor.
    const flip = e.clientX + OFFSET_X + TOOLTIP_MAX_WIDTH > window.innerWidth;
    setPos({ x: flip ? e.clientX - OFFSET_X - TOOLTIP_MAX_WIDTH : e.clientX + OFFSET_X, y: e.clientY + OFFSET_Y });
  }

  return (
    <span className={className} onMouseEnter={track} onMouseMove={track} onMouseLeave={() => setPos(null)}>
      {children}
      {pos !== null &&
        text &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: pos.x, top: pos.y, maxWidth: TOOLTIP_MAX_WIDTH }}
            className="fixed z-[100] pointer-events-none bg-deep text-white text-[11px] font-medium leading-relaxed px-3 py-2 rounded-input shadow-card-hover break-words"
          >
            {text}
          </div>,
          document.body,
        )}
    </span>
  );
}
