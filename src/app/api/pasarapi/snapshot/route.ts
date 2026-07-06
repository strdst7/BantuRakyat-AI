import { NextResponse } from 'next/server';
import { fetchPasarApiSnapshot } from '../../../../lib/pasarapi';

export async function GET() {
  try {
    const snapshot = await fetchPasarApiSnapshot();
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch PasarAPI snapshot', details: error.message }, { status: 500 });
  }
}
