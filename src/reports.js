import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

async function loadReports() {
  const files = await fs.readdir('./reports');
  const reportFiles = files.filter((file) => file.endsWith('.json'));
  const fileContents = await Promise.all(
    reportFiles.map(async (file) => {
      const fullPath = path.join('./reports', file);
      return await fs.readFile(fullPath, 'utf8');
    })
  );
  return fileContents.map((content) => JSON.parse(content));
}

// GET reports
router.get('/', async (req, res) => {
  try {
    const reports = await loadReports();
    res.status(200).json({ reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// POST reports
router.post('/', async (req, res) => {
  const report = req.body;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `chaos-report-${timestamp}.json`;
  try {
    await fs.mkdir('./reports', { recursive: true });
    await fs.writeFile(
      `./reports/${filename}`,
      JSON.stringify(report, null, 2)
    );
    res.status(201).json({ message: 'Report saved', filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// Export reports
router.get('/export', async (req, res) => {
  try {
    const format = req.query.format || 'csv';
    const reports = await loadReports();
    if (format === 'csv') {
      if (reports.length === 0) {
        return res.status(404).json({ error: 'No reports found' });
      }
      const headers = Object.keys(reports[0]);
      const csvRows = [
        headers.join(','),
        ...reports.map((r) =>
          headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')
        ),
      ];
      const csvContent = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reports.csv"'
      );
      res.send(csvContent);
    } else if (format === 'pdf') {
      res.status(501).json({ error: 'PDF export not implemented yet' });
    } else {
      res.status(400).json({ error: 'Invalid format, use csv or pdf' });
    }
  } catch (error) {
    console.error('Export failed:', error.message);
    res.status(500).json({ error: 'Failed to export reports' });
  }
});

export default router;