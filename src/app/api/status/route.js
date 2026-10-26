import { config } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

// Tells the UI which OpenRouter features are available (never exposes the key).
export function GET() {
  const { key, voiceModel, writingModel } = config();
  return Response.json({ configured: Boolean(key), voiceModel: key ? voiceModel : null, writingModel: key ? writingModel : null });
}
