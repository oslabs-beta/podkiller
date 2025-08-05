import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/reports', async (req, res) => {
  try {
    const files = await fs.readdir('./reports');
    const reports = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => fs.readFile(path.join('./reports', file), 'utf8'))
    );
    res.status(200).json({ reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reports' });
  }
});
// POST new report
app.post('/reports', async (req, res) => {
  const report = req.body;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `chaos-report-${timestamp}.json`;
  try {
    await fs.writeFile(
      `./reports/${filename}`,
      JSON.stringify(report, null, 2)
    );
    res.status(201).json({ message: 'Report saved', filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save report' });
  }
});
app.listen(PORT, () => {
  console.log(`dashboard for reports running at http://localhost:${PORT} `);
});
