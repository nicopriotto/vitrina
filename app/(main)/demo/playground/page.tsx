import { appUrl } from "@/lib/config";
import { DEMO_SLUG } from "@/lib/demo-const";
import { DemoPlayground } from "@/components/demo/DemoPlayground";

export const dynamic = "force-dynamic";

export default function DemoPlaygroundPage() {
  return <DemoPlayground mcpUrl={`${appUrl()}/api/stores/${DEMO_SLUG}/mcp`} />;
}
