const axios = require('axios');
const { buildSemesterPackQuery } = require('../utils/paperQuery');
const { normalizeBranch } = require('../utils/branches');

const safe = (value) => String(value).replace(/[^a-z0-9]/gi, '_');
async function downloadPdf(url) {
  const parsed = new URL(url);
  const hosts = ['res.cloudinary.com', ...(process.env.PAPER_STORAGE_ALLOWED_HOSTS || '').split(',').map((host) => host.trim())];
  if (parsed.protocol !== 'https:' || !hosts.includes(parsed.hostname)) throw new Error('Unsupported storage host');
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: 30 * 1024 * 1024, maxRedirects: 0 });
  const buffer = Buffer.from(response.data);
  if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new Error('Storage did not return a PDF');
  return buffer;
}

function createSemesterPackHandler({ Paper, download = downloadPdf }) {
  return async (req, res) => {
    const branch = normalizeBranch(req.query.branch);
    const semester = Number(req.query.semester);
    const examType = String(req.query.examType || '').trim();
    if (!branch || !Number.isInteger(semester) || semester < 1 || semester > 8 || !['Mid-Sem', 'End-Sem'].includes(examType)) {
      return res.status(400).json({ error: 'Choose a valid branch, semester and exam type.' });
    }
    const papers = await Paper.find({ ...buildSemesterPackQuery({ branch, semester, examType }), reviewStatus: { $nin: ['processing', 'needs_review', 'failed'] } }).sort({ subject: 1, year: -1 }).lean();
    if (!papers.length) return res.status(404).json({ error: 'No papers found for this semester pack.' });
    const { ZipArchive } = await import('archiver');
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const skipped = [];
    let added = 0;
    archive.on('error', () => res.destroy());
    res.on('close', () => { if (!res.writableEnded) archive.abort(); });
    // Delay headers until the first valid PDF: a failed pack must not look successful.
    for (const [index, paper] of papers.entries()) {
      if (res.destroyed) break;
      const name = `${safe(paper.subject || 'Subject')}_${safe(paper.year || 'Year')}_${safe(examType)}_${index + 1}`;
      try {
        const pdf = await download(paper.filePath);
        if (!added) {
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="PaperStack_${safe(branch)}_Sem${semester}_${safe(examType)}_Pack.zip"`);
          archive.pipe(res);
        }
        archive.append(pdf, { name: `${name}.pdf` });
        added += 1;
        if (paper.solutionPath) {
          try { archive.append(await download(paper.solutionPath), { name: `${name}_Solution.pdf` }); }
          catch { skipped.push(`${name}_Solution.pdf`); }
        }
        // A counter failure must not invalidate an otherwise downloadable paper.
        await Paper.findByIdAndUpdate(paper._id, { $inc: { downloads: 1 } }).catch(() => {});
      } catch { skipped.push(`${name}.pdf`); }
    }
    if (res.destroyed) return;
    if (!added) { archive.abort(); return res.status(502).json({ error: 'The PDF files are temporarily unavailable. Please try again.' }); }
    if (skipped.length) archive.append(`Some files could not be downloaded. Retry the pack later.\n\n${skipped.join('\n')}`, { name: 'DOWNLOAD_NOTES.txt' });
    await archive.finalize();
  };
}
module.exports = { createSemesterPackHandler, downloadPdf };
