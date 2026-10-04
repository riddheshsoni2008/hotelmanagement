import { POST as handleCheckInPost, GET as handleStaysGet } from '@/app/api/stays/route';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  return handleCheckInPost(request);
}

export async function GET(request: NextRequest) {
  return handleStaysGet(request);
}
