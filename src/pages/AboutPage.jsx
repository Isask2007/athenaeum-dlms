import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LibraryBig, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Card } from '../components/ui/index.jsx';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">About Athenaeum</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink-900 dark:text-white">A library built around how people actually study.</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600 dark:text-ink-300">Athenaeum brings the card catalog, circulation desk and digital reading room into one calm, fast workspace. It is designed for students, faculty and the librarians who support them.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          { icon: LibraryBig, title: 'One catalog', text: 'Physical books, e-books, papers and media share a single search index with precise filters.' },
          { icon: BookOpen, title: 'Built-in reader', text: 'Read PDFs and paginated texts online, bookmark pages and generate citations instantly.' },
          { icon: ShieldCheck, title: 'Clear roles', text: 'Members borrow and read; librarians manage circulation; administrators oversee people and policy.' },
        ].map((item) => <Card key={item.title} className="p-6"><div className="mb-4 w-fit rounded-xl bg-ink-900/5 p-3 text-ink-800 dark:bg-gold-500/10 dark:text-gold-400"><item.icon size={22} /></div>
          <h2 className="font-display text-lg font-bold">{item.title}</h2><p className="mt-2 text-sm text-ink-500">{item.text}</p></Card>)}
      </div>
      <div className="mt-10 rounded-2xl bg-ink-900 p-8 text-white">
        <Sparkles className="text-gold-400" size={28} />
        <h2 className="mt-4 font-display text-2xl font-bold">Ready to explore?</h2>
        <p className="mt-2 text-sm text-ink-200">Your next reference is only a search away.</p>
        <Link to="/catalog" className="mt-5 inline-block"><Button variant="gold">Open the catalog</Button></Link>
      </div>
    </div>
  );
}
