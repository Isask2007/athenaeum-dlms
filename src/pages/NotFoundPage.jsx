import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Button } from '../components/ui/index.jsx';

export default function NotFoundPage() {
  return <div className="mx-auto max-w-2xl px-4 py-24"><EmptyState title="404 — Page not found" description="The shelf you're looking for doesn't exist. Try the catalog instead." action={<Link to="/"><Button>Back to the library</Button></Link>} /></div>;
}
