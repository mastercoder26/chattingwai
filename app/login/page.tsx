import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authConfig, SESSION_COOKIE, verifySession } from '@/lib/auth';
import { Entrance } from '@/components/entrance';

export default async function Login() {
  const config = authConfig();
  const cookieStore = await cookies();
  if (verifySession(cookieStore.get(SESSION_COOKIE)?.value, config)) redirect('/');
  return <Entrance configured={Boolean(config)} />;
}
