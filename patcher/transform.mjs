// Applies the single-window opening bridge to a DSH desktop build the user owns.
//
// Nothing here ships or derives from DSH's own source: the transformations are
// anchor-based text edits performed at patch time against the archive that is
// already installed on the user's machine, and the only code inserted is our
// bridge (./bridge.mjs) and our preload snippet
// (./preload-single-opening.cjs).
import fs from 'node:fs';
import { installSingleWindowOpening } from './bridge.mjs';

const PRELOAD_SNIPPET = fs.readFileSync(new URL('./preload-single-opening.cjs', import.meta.url), 'utf8');

// Exact main-scope insertion point. A build that does not contain this verbatim
// is a version we refuse to guess about.
const ROOT_ANCHOR = '\tif (process.platform === "win32") {\n\t\tipcMain.handle(DESKTOP_IPC.windowsMenu';

export class UnsupportedBuildError extends Error {
  constructor(reason) {
    super(reason);
    this.name = 'UnsupportedBuildError';
  }
}

function requireSingle(haystack, needle, label, { count = 2 } = {}) {
  const parts = haystack.split(needle);
  if (parts.length !== count) {
    throw new UnsupportedBuildError(
      `${label}: expected exactly ${count - 1} occurrence, found ${parts.length - 1}. `
      + 'This DSH build is not one the patcher has been validated against.',
    );
  }
  return parts;
}

export function transformDesktop(main, preload) {
  let text = main;

  // Remove any bridge from a previous run so patching is idempotent.
  text = text.replace(/\/\/ whale-opening (?:native bridge v5|bridge begin)[\s\S]*?\/\/ whale-opening bridge-end\n?/g, '');
  text = text.replace(/ipcMain\.handle\('dsh-desktop:opening-(?:open|close)', \(\) => false\);\n/g, '');
  text = text.replace(
    /\/\/ whale-opening presentation begin[\s\S]*?whaleStartup\.present\(window,activate\);([\s\S]*?)\n\t\t\},error=>reportFatal\(error,"main"\)\);\n\t\t\/\/ whale-opening presentation end/g,
    (_all, tail) => 'if (activate) window.show();\n\t\telse window.showInactive();' + tail,
  );
  text = text.replace(/\n\t\twhaleStartup\.arm\(window\);/g, '');
  text = text.replace(
    /await whaleStartup\.wait\(window\);\s*if \(isQuitting\(\) \|\| recovery\.active \|\| window\.isDestroyed\(\)\) return;\s*whaleStartup\.present\(window,\s*activate\);/g,
    'if (activate) window.show();\n\t\telse window.showInactive();',
  );

  requireSingle(text, ROOT_ANCHOR, 'main process insertion anchor');

  const bridge = `// whale-opening bridge begin\nconst whaleStartup = (${installSingleWindowOpening.toString()})`
    + '({ipcMain,getMain:()=>mainWindow,platform:process.platform});\n// whale-opening bridge-end\n';
  text = text.replace(ROOT_ANCHOR, bridge + ROOT_ANCHOR);

  const create = 'mainWindow = window;\n\t\tbrowserGuests.bind';
  const show = 'if (activate) window.show();\n\t\telse window.showInactive();';
  requireSingle(text, create, 'main window creation site');
  requireSingle(text, show, 'workspace presentation site');
  if (!text.includes('createWindow(appPreload, false, true)')) {
    throw new UnsupportedBuildError('main window boot flag: the main window must start hidden');
  }

  text = text.replace(create, 'mainWindow = window;\n\t\twhaleStartup.arm(window);\n\t\tbrowserGuests.bind');

  const showStart = text.indexOf(show);
  const showEnd = text.indexOf('\n\t};\n\tlet openingWelcome;', showStart);
  if (showEnd <= showStart) {
    throw new UnsupportedBuildError('workspace presentation tail: anchor for the closing statement not found');
  }
  const tail = text.slice(showStart, showEnd).replace(show, 'whaleStartup.present(window,activate);');
  text = text.slice(0, showStart)
    + '// whale-opening presentation begin\n\t\twhaleStartup.schedule(window,()=>{\n\t\t'
    + 'if (isQuitting() || recovery.active || window.isDestroyed() || window !== mainWindow) return;\n\t\t'
    + tail
    + '\n\t\t},error=>reportFatal(error,"main"));\n\t\t// whale-opening presentation end'
    + text.slice(showEnd);

  let nextPreload = preload.replace(/\n?\/\/ whale-opening single preload begin[\s\S]*?\/\/ whale-opening single preload end\n?/g, '');

  const opening = /\t\topening: \{[\s\S]*?\n\t\t\},/g;
  const matches = [...nextPreload.matchAll(opening)];
  if (matches.length !== 1) {
    throw new UnsupportedBuildError(
      `preload opening bridge: expected exactly 1 occurrence, found ${matches.length}`,
    );
  }
  nextPreload = nextPreload.replace(
    opening,
    "\t\topening: {\n"
    + "\t\t\tsinglePrepare: (bounds) => electron.ipcRenderer.invoke('dsh-desktop:single-opening-prepare', bounds),\n"
    + "\t\t\tsingleReady: () => electron.ipcRenderer.invoke('dsh-desktop:single-opening-ready'),\n"
    + "\t\t\tsingleFinish: () => electron.ipcRenderer.invoke('dsh-desktop:single-opening-finish')\n"
    + '\t\t},',
  );
  nextPreload += '\n' + PRELOAD_SNIPPET;

  return { main: text, preload: nextPreload };
}

/** Replace the poster placeholder with an inline data URL. */
export function applyPoster(preload, dataUrl) {
  return preload.replaceAll('__WHALE_POSTER_DATA_URL__', dataUrl);
}
