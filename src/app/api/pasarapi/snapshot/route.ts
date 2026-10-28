import { NextResponse } from 'next/server';
import { fetchPasarApiSnapshot } from '../../../../lib/pasarapi';

export async function GET() {
  try {
    const snapshot = await fetchPasarApiSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Failed to fetch PasarAPI snapshot:', error);
    return NextResponse.json({ error: 'Failed to fetch PasarAPI snapshot' }, { status: 500 });
  }
}
