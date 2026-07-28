import { EmittersListView } from "@/components/config/EmittersListView";

export const dynamic = "force-dynamic";

export default function EmittersConfigPage() {
  return <EmittersListView basePath="/config" />;
}
