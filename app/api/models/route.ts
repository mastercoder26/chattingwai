import { getModels } from '@/lib/models';
import { requestAuthenticated } from '@/lib/auth';
export async function GET(request: Request) {
  if (!requestAuthenticated(request))
    return Response.json({ error: 'Unlock your workspace to continue.' }, { status: 401 });
  const catalog = await getModels();
  return Response.json(
    { ...catalog, configured: Boolean(process.env.HACKCLUB_API_KEY) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
