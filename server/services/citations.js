const initials = (name) => name.split(/\s+/).map((part, i, arr) => (i === arr.length - 1 ? `${part}.` : `${part[0]}.`)).join(' ');
const year = (r) => r.publication_year || 'n.d.';
const titleCase = (t) => t.replace(/\b\w/g, (c) => c.toUpperCase());

/** Generate citations in three common academic styles from catalog metadata. */
export function generateCitation(resource, style = 'apa') {
  const authors = resource.authors || [];
  const authorList = authors.length ? authors : ['Unknown author'];
  const t = resource.title || 'Untitled';
  const publisher = resource.publisher || 'Unknown publisher';
  const container = resource.category || 'Athenaeum Digital Library';

  switch (style.toLowerCase()) {
    case 'mla': {
      const first = authorList[0];
      const mlaAuthor = authorList.length > 1
        ? `${first.split(/\s+/).slice(-1)[0]}, ${first.split(/\s+/).slice(0, -1).join(' ')}, et al.`
        : `${first.split(/\s+/).slice(-1)[0]}, ${first.split(/\s+/).slice(0, -1).join(' ')}.`;
      return `${mlaAuthor} ${titleCase(t)}. ${publisher}, ${year(resource)}.${resource.is_digital ? ' Athenaeum Digital Library,' : ''}`;
    }
    case 'ieee': {
      const names = authorList.map((a) => {
        const parts = a.split(/\s+/);
        return `${parts.slice(0, -1).map((p) => `${p[0]}.`).join(' ')} ${parts.slice(-1)[0]}`;
      }).join(', ');
      const kind = resource.format === 'research_paper' ? '[J]' : resource.format === 'ebook' ? '[EB]' : '[B]';
      return `${names}, ${kind} ${t}, ${publisher}, ${year(resource)}.`;
    }
    case 'apa':
    default: {
      const apaAuthors = authorList.map((a) => {
        const parts = a.split(/\s+/);
        return `${parts.slice(-1)[0]}, ${parts.slice(0, -1).map((p) => `${p[0]}.`).join(' ')}`;
      }).join(', ');
      const extra = resource.edition && !resource.edition.includes('1st') ? ` (${resource.edition})` : '';
      return `${apaAuthors} (${year(resource)}). ${t}${extra}. ${publisher}. ${container}.`;
    }
  }
}

export const citationStyles = [
  { id: 'apa', label: 'APA 7th' },
  { id: 'mla', label: 'MLA 9th' },
  { id: 'ieee', label: 'IEEE' },
];
