"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Pencil } from "lucide-react";
import { deletePlatformConfig } from "@/lib/actions/platformConfigs";
import { deleteEmitterConfig } from "@/lib/actions/emitterConfigs";

export function DeleteConfigButton({
  kind,
  configId,
  configName,
  editHref,
}: {
  kind: "platform" | "emitter";
  configId: string;
  configName: string;
  editHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      try {
        if (kind === "platform") {
          await deletePlatformConfig(configId);
        } else {
          await deleteEmitterConfig(configId);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir mapeamento.");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-1 max-w-[75%]">
      <div className="flex items-center gap-1 shrink-0">
        {!confirming && (
          <Link
            href={editHref}
            title={`Editar ${configName}`}
            className="flex items-center justify-center p-1.5 rounded-input text-ink/30 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Link>
        )}
        <button
          onClick={handleClick}
          onBlur={() => !error && setConfirming(false)}
          disabled={pending}
          title={confirming ? "Clique novamente para confirmar" : `Excluir ${configName}`}
          className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-input transition-colors disabled:opacity-50 ${
            confirming ? "bg-danger text-white" : "text-ink/30 hover:text-danger hover:bg-danger/10"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirming && (pending ? "Excluindo..." : "Confirmar")}
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-danger bg-danger/10 rounded-input px-2 py-1.5 text-right">
          {error}
        </p>
      )}
    </div>
  );
}
