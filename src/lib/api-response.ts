import { NextResponse } from 'next/server';
import { AuthenticationError } from '@/lib/server-auth';

export function apiError(error: unknown, context: string): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (error instanceof Error && (
    error.message.includes('required') ||
    error.message.includes('invalid') ||
    error.message.includes('too long') ||
    error.message.includes('must ')
  )) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(context, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

