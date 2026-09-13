const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const client = path.join(root, 'client-react');
const children = [];

function run(command, args, cwd) {
    const child = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: true,
        env: process.env
    });
    children.push(child);
    return child;
}

function waitForExit(child) {
    return new Promise((resolve, reject) => {
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${child.spawnargs.join(' ')} exited with code ${code}`));
        });
        child.on('error', reject);
    });
}

function shutdown() {
    children.forEach((child) => {
        try { child.kill(); } catch { /* already exited */ }
    });
}

process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });

async function main() {
    console.log('Building the website for http://localhost:3000 …');
    await waitForExit(run('npm', ['run', 'build'], client));

    console.log('Site + API will run together on http://localhost:3000');
    console.log('Frontend rebuilds on save — refresh the browser to see UI changes.');

    run('npx', ['vite', 'build', '--watch'], client);
    run('npx', ['nodemon', 'server/server.js'], root);
}

main().catch((err) => {
    console.error(err.message || err);
    shutdown();
    process.exit(1);
});
