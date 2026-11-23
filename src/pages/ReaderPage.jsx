import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import { DigitalReader } from '../components/reader/index.jsx';
import { Button, EmptyState, Spinner } from '../components/ui/index.jsx';

export default function ReaderPage() {
  const { id } = useParams();
  const { data, loading, error } = useApi(`/catalog/${id}`);
  if (loading) return <Spinner label="Opening the reader…" />;
  if (error || !data?.item) return <div className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="Cannot open this resource" description={error?.message} action={<Link to="/catalog"><Button>Back to catalog</Button></Link>} /></div>;
  return <DigitalReader item={data.item} />;
}
