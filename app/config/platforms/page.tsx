import { PlatformsListView } from "@/components/config/PlatformsListView";

export const dynamic = "force-dynamic";

export default function PlatformsConfigPage() {
  return <PlatformsListView basePath="/config" />;
}
