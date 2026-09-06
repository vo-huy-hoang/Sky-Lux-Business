const fs = require('fs');
const path = require('path');

console.log('[patch-next] Starting Next.js App Router dynamic route patch...');

// 1. Patch on-demand-entry-handler.js
const onDemandFile = path.join(__dirname, '../node_modules/next/dist/server/dev/on-demand-entry-handler.js');
if (fs.existsSync(onDemandFile)) {
  let content = fs.readFileSync(onDemandFile, 'utf8');
  const targetPattern = 'pagePath = await (0, _findpagefile.findPageFile)(appDir, normalizedPagePath, extensions, true);';
  const patchSnippet = `pagePath = await (0, _findpagefile.findPageFile)(appDir, normalizedPagePath, extensions, true);
        if (!pagePath && !normalizedPagePath.endsWith('/page')) {
            pagePath = await (0, _findpagefile.findPageFile)(appDir, normalizedPagePath + '/page', extensions, true);
        }`;

  if (!content.includes("if (!pagePath && !normalizedPagePath.endsWith('/page'))")) {
    if (content.includes(targetPattern)) {
      content = content.replace(targetPattern, patchSnippet);
      fs.writeFileSync(onDemandFile, content, 'utf8');
      console.log('[patch-next] (1/3) Patched on-demand-entry-handler.js');
    }
  } else {
    console.log('[patch-next] (1/3) on-demand-entry-handler.js already patched.');
  }
}

// 2. Patch setup-dev-bundler.js
const setupBundlerFile = path.join(__dirname, '../node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.js');
if (fs.existsSync(setupBundlerFile)) {
  let content = fs.readFileSync(setupBundlerFile, 'utf8');
  const targetBundler = `opts.fsChecker.ensureCallback(async function ensure(item) {
        if (item.type === 'appFile' || item.type === 'pageFile') {
            await hotReloader.ensurePage({
                clientOnly: false,
                page: item.itemPath,
                isApp: item.type === 'appFile',
                definition: undefined
            });
        }
    });`;

  const patchedBundler = `opts.fsChecker.ensureCallback(async function ensure(item) {
        if (item.type === 'appFile' || item.type === 'pageFile') {
            const pageName = item.type === 'appFile' && !item.itemPath.endsWith('/page') && !item.itemPath.endsWith('/route') ? (item.itemPath + '/page') : item.itemPath;
            await hotReloader.ensurePage({
                clientOnly: false,
                page: pageName,
                isApp: item.type === 'appFile',
                definition: undefined
            });
        }
    });`;

  if (!content.includes("const pageName = item.type === 'appFile'")) {
    if (content.includes("page: item.itemPath,")) {
      content = content.replace(targetBundler, patchedBundler);
      fs.writeFileSync(setupBundlerFile, content, 'utf8');
      console.log('[patch-next] (2/3) Patched setup-dev-bundler.js');
    }
  } else {
    console.log('[patch-next] (2/3) setup-dev-bundler.js already patched.');
  }
}

// 3. Patch hot-reloader-turbopack.js
const turbopackFile = path.join(__dirname, '../node_modules/next/dist/server/dev/hot-reloader-turbopack.js');
if (fs.existsSync(turbopackFile)) {
  let content = fs.readFileSync(turbopackFile, 'utf8');
  const targetTurbo = 'const route = isInsideAppDir ? currentEntrypoints.app.get(normalizedAppPage) : currentEntrypoints.page.get(page);';
  const patchedTurbo = 'const route = isInsideAppDir ? (currentEntrypoints.app.get(normalizedAppPage) || currentEntrypoints.app.get(`${normalizedAppPage}/page`)) : currentEntrypoints.page.get(page);';

  if (!content.includes('currentEntrypoints.app.get(`${normalizedAppPage}/page`)')) {
    if (content.includes(targetTurbo)) {
      content = content.replace(targetTurbo, patchedTurbo);
      fs.writeFileSync(turbopackFile, content, 'utf8');
      console.log('[patch-next] (3/3) Patched hot-reloader-turbopack.js');
    }
  } else {
    console.log('[patch-next] (3/3) hot-reloader-turbopack.js already patched.');
  }
}

console.log('[patch-next] Patch completed successfully.');
