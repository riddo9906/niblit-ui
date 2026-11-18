import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tauri = process.argv.includes('--tauri');
const planning = process.argv.includes('--plan');
const checking = process.argv.includes('--check-config');
const forwarded = process.argv.slice(2).filter(arg => !['--tauri', '--plan', '--check-config'].includes(arg));
process.chdir(root); // The caller's working directory is not a resource location.
const scoped = Boolean(process.env.NIBLIT_UI_DIST_DIR);
for (const name of ['NIBLIT_UI_DIST_DIR', 'NIBLIT_TS_BUILD_INFO_DIR', 'CARGO_TARGET_DIR']) {
  if (process.env[name] && !path.isAbsolute(process.env[name])) throw new Error(name + ' must be absolute');
}
if (scoped && (!process.env.CARGO_TARGET_DIR || !process.env.NIBLIT_TS_BUILD_INFO_DIR || !process.env.NIBLIT_BUILD_ROOT)) throw new Error('Use the complete Core scoped-build profile');
const compiler = path.join(root, 'node_modules/typescript/bin/tsc');
const viteConfig = scoped ? path.join(process.env.NIBLIT_BUILD_WORK_DIR || process.env.NIBLIT_TS_BUILD_INFO_DIR, 'ui-vite.config.mjs') : null;
const commands = tauri ? [{ args: [path.join(root, 'node_modules/@tauri-apps/cli/tauri.js'), 'build',
  ...(scoped ? ['--config', JSON.stringify({ build: { frontendDist: path.toNamespacedPath(process.env.NIBLIT_UI_DIST_DIR) } })] : []), ...forwarded] }]
  : scoped ? ['app', 'node'].map(project => ({ args: [compiler, '--project', 'tsconfig.' + project + '.json', '--noEmit',
    '--incremental', '--tsBuildInfoFile', path.join(process.env.NIBLIT_TS_BUILD_INFO_DIR, project + '.tsbuildinfo')] }))
  : [{ args: [compiler, '-b'] }];
if (!tauri) commands.push({ args: [path.join(root, 'node_modules/vite/bin/vite.js'), 'build',
  ...(viteConfig ? ['--config', viteConfig] : []), ...forwarded] });
if (planning) console.log(JSON.stringify({ commands, scoped, filesWritten: false, servicesStarted: false }, null, 2));
else {
  if (scoped) fs.mkdirSync(process.env.NIBLIT_TS_BUILD_INFO_DIR, { recursive: true });
  if (viteConfig && !tauri) {
    fs.mkdirSync(path.dirname(viteConfig), { recursive: true });
    const text = `import config from ${JSON.stringify(path.join(root, 'vite.config.ts').replaceAll('\\', '/'))};\nexport default config;\n`;
    if (fs.existsSync(viteConfig) && fs.readFileSync(viteConfig, 'utf8') !== text) throw new Error('Existing Vite build configuration differs');
    if (!fs.existsSync(viteConfig)) fs.writeFileSync(viteConfig, text);
  }
  if (checking) {
    if (tauri) throw new Error('Use frontend --check-config without --tauri');
    const { resolveConfig } = await import('vite');
    const config = await resolveConfig({ root, configFile: viteConfig || path.join(root, 'vite.config.ts') }, 'build', 'production');
    console.log(JSON.stringify({ root: config.root, outDir: config.build.outDir,
      cacheDir: config.cacheDir, emptyOutDir: config.build.emptyOutDir, compiled: false, servicesStarted: false }));
  } else for (const command of commands) {
    const result = spawnSync(process.execPath, command.args, { cwd: root, env: process.env, stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  }
}


