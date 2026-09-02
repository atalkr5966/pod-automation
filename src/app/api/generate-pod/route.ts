import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/storage';
import { generateOpeningPod } from '@/lib/analyzer';

export async function GET() {
  const users = getAllUsers();
  const activeUser = users[0];

  if (!activeUser) {
    return NextResponse.json({ error: 'No user found' }, { status: 404 });
  }

  const podTemplate = generateOpeningPod(activeUser);
  return NextResponse.json({ pod: podTemplate });
}
