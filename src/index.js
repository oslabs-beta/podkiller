import chalk from 'chalk';
import { killPod } from './killpod.js';

export async function runPodKiller(options = {}) {
  if (options.verbose) {
    console.log(chalk.blue('📝 Options:'), options);
  }

  if (options.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No pods will actually be killed'));
    return;
  }

  try {
    console.log(chalk.green('🎯 Using killPod function...'));
    await killPod();
    console.log(chalk.green('✅ killPod completed successfully!'));
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}