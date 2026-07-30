import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white rounded-card-sm border border-ink/5 shadow-card ${className}`}
      {...props}
    />
  );
}

/** Card de painel com faixa de título — o mesmo cabeçalho para gráfico, lista
 *  ou tabela, para que todos os painéis do dashboard tenham a mesma silhueta
 *  em vez de cada um inventar o seu. */
export function PanelCard({
  title,
  action,
  className = "",
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`overflow-hidden flex flex-col ${className}`}>
      <div className="px-6 py-4 border-b border-ink/8 bg-paper-alt/40 flex items-center justify-between gap-3 shrink-0">
        <h4 className="text-sm font-bold text-ink">{title}</h4>
        {action}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </Card>
  );
}
