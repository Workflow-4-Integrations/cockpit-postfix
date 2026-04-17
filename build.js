#!/usr/bin/env node

import fs from 'node:fs';
import process from 'node:process';

import { sassPlugin } from 'esbuild-sass-plugin';
import { cockpitPoEsbuildPlugin } from './pkg/lib/cockpit-po-plugin.js';
import { cockpitRsyncEsbuildPlugin } from './pkg/lib/cockpit-rsync-plugin.js';
import { cleanPlugin } from './pkg/lib/esbuild-cleanup-plugin.js';
import { cockpitCompressPlugin } from './pkg/lib/esbuild-compress-plugin.js';

const esbuild = (await import('esbuild')).default;
const production = process.env.NODE_ENV === 'production';
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const nodePaths = ['pkg/lib'];

const context = await esbuild.context({
  bundle: true,
  entryPoints: ['./src/index.tsx'],
  legalComments: 'external',
  external: ['*.woff', '*.woff2', '*.jpg', '*.svg', '../../assets*', '../../static/fonts/*'],
  loader: {
    '.js': 'jsx',
    '.ts': 'ts',
    '.tsx': 'tsx'
  },
  minify: production,
  nodePaths,
  outdir: 'dist',
  sourcemap: production ? false : 'linked',
  target: ['es2020'],
  plugins: [
    cleanPlugin(),
    {
      name: 'copy-assets',
      setup(build) {
        build.onEnd((result) => {
          if (result?.errors.length === 0) {
            fs.copyFileSync('./src/manifest.json', './dist/manifest.json');
            fs.copyFileSync('./src/index.html', './dist/index.html');
          }
        });
      }
    },
    sassPlugin({
      loadPaths: [...nodePaths, 'node_modules'],
      filter: /\.scss$/,
      quietDeps: true
    }),
    cockpitPoEsbuildPlugin(),
    ...(production ? [cockpitCompressPlugin()] : []),
    cockpitRsyncEsbuildPlugin({ dest: packageJson.name })
  ]
});

try {
  await context.rebuild();
} catch (error) {
  process.exit(1);
}

if (process.env.ESBUILD_WATCH === 'true') {
  await context.watch();
} else {
  await context.dispose();
}
