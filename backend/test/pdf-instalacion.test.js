const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolverCli } = require('../scripts/instalarNavegadorPdf');
test('el instalador resuelve y ejecuta la CLI sin depender de exports privados', () => {
    const result = spawnSync(process.execPath, [resolverCli(), '--version'], { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Version \d+\.\d+/);
});
