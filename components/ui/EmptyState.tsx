/** Estado vazio no padrão plano-a-ux: ícone, o que aconteceu e qual é o
 *  próximo passo. Substitui as linhas de texto em itálico que só diziam
 *  "nenhum registro" sem dizer o que fazer a respeito. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="w-14 h-14 mx-auto rounded-card-sm bg-mint/12 flex items-center justify-center">
        <Icon className="w-6 h-6 text-mint-700" />
      </div>
      <h3 className="text-base text-ink mt-4">{title}</h3>
      {description && <p className="text-sm text-text-2 mt-1.5 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
