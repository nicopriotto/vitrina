import { appUrl } from "@/lib/config";
import { DEMO_SLUG } from "@/lib/demo-const";
import { DemoStore } from "@/components/demo/DemoStore";

export const dynamic = "force-dynamic";

export default function DemoStorePage() {
  return <DemoStore mcpUrl={`${appUrl()}/api/stores/${DEMO_SLUG}/mcp`} />;
}
