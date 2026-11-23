/** Generates the seeded SVG covers and valid sample PDFs for the built-in reader. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resources } from '../server/db/seed-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coverDir = path.join(root, 'public', 'covers');
const pdfDir = path.join(root, 'public', 'digital');
fs.mkdirSync(coverDir, { recursive: true });
fs.mkdirSync(pdfDir, { recursive: true });

const escapeXml = (text) => String(text).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
const wrap = (text, width = 20) => {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) { lines.push(line.trim()); line = word; }
    else line += ` ${word}`;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
};

for (const item of resources) {
  const slug = item.cover_url.split('/').pop();
  const titleLines = wrap(item.title, 20).slice(0, 6);
  const titleSvg = titleLines.map((line, i) =>
    `<text x="40" y="${252 + i * 40}" fill="#ffffff" font-family="Georgia,serif" font-size="34" font-weight="bold">${escapeXml(line)}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" role="img" aria-label="${escapeXml(item.title)} cover">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${item.color}"/><stop offset="1" stop-color="${item.color}" stop-opacity="0.72"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <circle cx="332" cy="112" r="150" fill="${item.accent}" opacity="0.14"/>
  <circle cx="70" cy="520" r="120" fill="${item.accent}" opacity="0.10"/>
  <rect x="0" y="0" width="12" height="600" fill="${item.accent}"/>
  <text x="40" y="76" fill="${item.accent}" font-family="Arial,sans-serif" font-size="15" letter-spacing="3">ATHENAEUM LIBRARY</text>
  <line x1="40" y1="96" x2="130" y2="96" stroke="${item.accent}" stroke-width="3"/>
  <text x="40" y="200" fill="${item.accent}" font-family="Arial,sans-serif" font-size="14" letter-spacing="2">${escapeXml(item.category.toUpperCase())}</text>
  ${titleSvg}
  <text x="40" y="520" fill="#ffffff" opacity="0.85" font-family="Arial,sans-serif" font-size="17">${escapeXml(item.authors.join(', '))}</text>
  <text x="40" y="552" fill="${item.accent}" font-family="Arial,sans-serif" font-size="13" letter-spacing="1">${escapeXml(item.publisher.toUpperCase())}</text>
</svg>`;
  fs.writeFileSync(path.join(coverDir, slug), svg);
}

const pdfEscape = (text) => String(text).replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7E]/g, '-');

function createPdf(title, author, pages) {
  const objects = [];
  const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>`;
  pages.forEach((page, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    const lines = [
      'BT /F1 12 Tf 72 740 Td (ATHENAEUM DIGITAL LIBRARY) Tj ET',
      `BT /F1 22 Tf 72 690 Td (${pdfEscape(title)}) Tj ET`,
      `BT /F1 14 Tf 72 662 Td (by ${pdfEscape(author)}) Tj ET`,
      `BT /F1 12 Tf 72 610 Td (${pdfEscape(page.heading)}) Tj ET`,
    ];
    wrap(page.paragraphs.join(' '), 88).slice(0, 18).forEach((line, i) => {
      lines.push(`BT /F1 11 Tf 72 ${580 - i * 19} Td (${pdfEscape(line)}) Tj ET`);
    });
    lines.push(`BT /F1 10 Tf 72 60 Td (Page ${index + 1} of ${pages.length} - Demo digital resource) Tj ET`);
    const stream = lines.join('\n');
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

let pdfCount = 0;
for (const item of resources.filter((r) => r.file)) {
  const name = path.basename(item.file_url);
  fs.writeFileSync(path.join(pdfDir, name), createPdf(item.title, item.authors.join(', '), item.pages_json));
  pdfCount++;
}
console.log(`Generated ${resources.length} covers and ${pdfCount} sample PDFs.`);
