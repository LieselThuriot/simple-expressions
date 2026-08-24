const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { minify } = require('terser');

const libDirectory = join(__dirname, '..', 'lib');

async function main() {
    const files = readdirSync(libDirectory)
        .filter((file) => file.endsWith('.js'));

    for (const file of files) {
        const path = join(libDirectory, file);
        const result = await minify(readFileSync(path, 'utf8'), {
            compress: true,
            mangle: true
        });

        if (result.code === undefined) {
            throw new Error(`Terser produced no output for ${file}`);
        }

        writeFileSync(path, result.code);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
