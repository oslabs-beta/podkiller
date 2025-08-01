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
    console.log(chalk.bold.red.bgWhite('🎯 Identifying Target...'));
    await killPod();
    console.log(chalk.bold.green.bgWhite('✅ Mission Complete!'));
  } catch (error) {
    console.error(chalk.red.bgWhite('❌ Error:'), error.message);
    process.exit(1);
  }
}