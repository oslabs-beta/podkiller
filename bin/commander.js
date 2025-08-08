#!/usr/bin/env node

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
  .description('We kill k8 pods.')
  .version(pkg.version);

program
  .command('kill')
  .description('Kill pods and measure recovery time')
  .option('-n, --namespace <namespace>', 'Kubernetes namespace', 'default')
  .option('--dry-run', 'Show what would be killed without actually doing it')
  .option('-o, --output-format <format>', 'Output format (human|json|markdown)', 'human')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    console.log(chalk.bold.black.bgGrey('🚀 PodKiller Launching...'));
    await runPodKiller(options);
  });

program.parse();