// Small real PDF fixtures with selectable text or a page containing only graphics.
function syntheticPdf(pages) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const kids = [];
  pages.forEach((lines, index) => {
    const pageId = 4 + index * 2, streamId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    const stream = lines.length ? `BT /F1 12 Tf 50 750 Td ${lines.map((line, i) => `${i ? '0 -20 Td ' : ''}(${line.replace(/[\\()]/g, '\\$&')}) Tj`).join('\n')} ET`
      : '0.5 g 40 40 100 100 re f';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  let source = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(source)); source += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`;
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(source);
}
module.exports = { syntheticPdf };
