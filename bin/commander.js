import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import inquirer from 'inquirer';

// Get package.json data
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
  .name('podkiller')
  .description('We kill k8 pods.')
  .version(pkg.version);

// Command to kill a random pod  
program
  .command('kill')
  .description('Kill pods and measure recovery time')
  .option('-n, --namespace <namespace>', 'Kubernetes namespace')
  .option('-l, --label-selector <selector>', 'Label selector for filtering pods')
  .option('--dry-run', 'Show what would be killed without actually doing it')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    if (options.verbose) {
      console.log(chalk.blue('📝 Options:'), options);
    }

    if (options.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No pods will actually be killed'));
      return;
    }

    try {
      console.log(chalk.bold.black.bgGrey('🚀 PodKiller Launching...'));
      console.log(chalk.bold.red.bgGrey('🎯 Identifying Target...'));
      
      const { killPod } = await import('../src/killpod.js');
      const result = await killPod(options.labelSelector, options.namespace);
      
      if (result && result.success) {
        console.log(chalk.bold.green.bgGrey('✅ Mission Complete!'));
        if (result.recoveryTime) {
          console.log(chalk.green(`Recovery time: ${result.recoveryTime.toFixed(2)} seconds`));
        }
      } else {
        console.log(chalk.yellow('⚠️ No action taken'));
      }
    } catch (error) {
      console.error(chalk.red.bgWhite('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Command to show all namespaces and their pods
// This is the default action
program
  .action(async () => {
    try {
      const k8s = await import('@kubernetes/client-node');
      const kc = new k8s.KubeConfig();
      kc.loadFromDefault();
      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      
      const { getAvailableNamespaces, killPod } = await import('../src/killpod.js');
      const namespaces = await getAvailableNamespaces();
      
      console.log(chalk.bold.cyan('📋 Available Namespaces:'));
      
      // Display namespaces with pod counts
      const namespaceChoices = [];
      for (let i = 0; i < namespaces.length; i++) {
        const ns = namespaces[i];
        const res = await k8sApi.listNamespacedPod({ namespace: ns });
        const podCount = res.items.length;
        console.log(chalk.green(`${i + 1}. ${ns} (${podCount} pods)`));
        namespaceChoices.push({
          name: `${ns} (${podCount} pods)`,
          value: ns
        });
      }
      
      // Ask user to choose namespace
      const { selectedNamespace } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedNamespace',
          message: 'Which namespace would you like to work with?',
          choices: namespaceChoices
        }
      ]);
      
      console.log(chalk.bold.blue(`\n🎯 Working with namespace: ${selectedNamespace}`));
      
      // Loop for pod operations
      while (true) {
        // Get fresh pod list each time
        const res = await k8sApi.listNamespacedPod({ namespace: selectedNamespace });
        const pods = res.items.map(pod => ({
          name: pod.metadata.name,
          status: pod.metadata.deletionTimestamp ? 'Terminating' : pod.status.phase
        }));
        
        if (pods.length === 0) {
          console.log(chalk.yellow('No pods found in this namespace.'));
          break;
        }
        
        console.log(chalk.bold.cyan('\n📦 Available Pods:'));
        const podChoices = pods.map(pod => ({
          name: `${pod.name} (${pod.status})`,
          value: pod.name
        }));
        
        // Add option to exit
        podChoices.push(
          {
            name: chalk.magenta('🎲 Kill Random Pod'),
            value: 'RANDOM'
          },
          {
            name: chalk.red('Exit'),
            value: 'EXIT'
          });
        
        // Ask user to choose pod
        const { selectedPod } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedPod',
            message: 'Which pod would you like to kill?',
            choices: podChoices
          }
        ]);
        
        // Check if user wants to exit
        if (selectedPod === 'EXIT') {
          console.log(chalk.blue('👋 Goodbye!'));
          break;
        }

        // Check if user wants random
        if (selectedPod === 'RANDOM') {
          console.log(chalk.bold.red.bgGrey('🎯 Killing random pod...'));
          const result = await killPod(null, selectedNamespace);
          
          if (result && result.success) {
            console.log(chalk.bold.green.bgGrey('✅ Mission Complete!'));
            if (result.recoveryTime) {
              console.log(chalk.green(`Recovery time: ${result.recoveryTime.toFixed(2)} seconds`));
            }
          }
          continue; // Go back to pod selection
        }
        
        // Confirm the action
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to kill pod "${selectedPod}" in namespace "${selectedNamespace}"?`,
            default: false
          }
        ]);
        
        if (!confirm) {
          console.log(chalk.yellow('Operation cancelled.'));
          // Loop continues to show pods again
          continue;
        }
        
        // Execute the kill
        console.log(chalk.bold.red.bgGrey('🎯 Killing selected pod...'));
        const result = await killPod(null, selectedNamespace, selectedPod);
        
        if (result && result.success) {
          console.log(chalk.bold.green.bgGrey('✅ Mission Complete!'));
          if (result.recoveryTime) {
            console.log(chalk.green(`Recovery time: ${result.recoveryTime.toFixed(2)} seconds`));
          }
        }
        
        // Loop continues to show updated pods again
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
    }
  });

program.parse();