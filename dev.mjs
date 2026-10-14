import { spawn } from 'node:child_process';

// Use a dedicated directory for development artifacts to prevent chunk collisions with production build
process.env.NEXT_DIST_DIR = '.next_dev';

const rawArgs = process.argv.slice(2);
const nextArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    if (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
      nextArgs.push('-H', rawArgs[i + 1]);
      i++;
    } else {
      nextArgs.push('-H', '0.0.0.0');
    }
  } else if (arg.startsWith('--host=')) {
    nextArgs.push('-H', arg.slice('--host='.length));
  } else {
    nextArgs.push(arg);
  }
}

if (!nextArgs.includes('-p') && !nextArgs.includes('--port')) {
  nextArgs.unshift('-p', '3000');
}
if (!nextArgs.includes('-H') && !nextArgs.includes('--hostname')) {
  nextArgs.unshift('-H', '0.0.0.0');
}

const child = spawn('npx', ['next', 'dev', ...nextArgs], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
