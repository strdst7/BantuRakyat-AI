import React from 'react';
import { fetchPasarApiSnapshot } from '../lib/pasarapi';
import BantuanClient from './bantuan-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const snapshot = await fetchPasarApiSnapshot();
  return <BantuanClient initialSnapshot={snapshot} />;
}
