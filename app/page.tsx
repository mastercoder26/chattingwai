import { ChatWorkspace } from '@/components/chat-workspace';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authConfig, SESSION_COOKIE, verifySession } from '@/lib/auth';
export default async function Home() {
  if (!verifySession((await cookies()).get(SESSION_COOKIE)?.value, authConfig()))
    redirect('/login');
  return <ChatWorkspace />;
}
