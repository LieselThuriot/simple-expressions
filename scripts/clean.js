const { rmSync } = require('node:fs');

rmSync('lib', { force: true, recursive: true });
