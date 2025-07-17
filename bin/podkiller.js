// Main CLI Entry Point

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get package.json data
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

// Import your main application logic
import { runPodKiller } from '../src/index.js';

program
  .name('podkiller')
  .description('Chaos Monkey Lite - Simple pod killing for dev/staging')
  .version(pkg.version);

program
  .command('kill')
  .description('Kill pods and measure recovery time')
  .action(() => {
    console.log(chalk.yellow('🚀 PodKiller starting...'));
    runPodKiller();
  });

program.parse();