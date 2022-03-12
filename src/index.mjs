import esMain from 'es-main';
import minimist from 'minimist';

import createServer from './server.mjs';

const IP = `0.0.0.0`;
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;

// If this has not been imported from somewhere else, run
//  the server.
if (esMain(import.meta)) {
    const argv = minimist(process.argv.slice(2));
    run(argv);
}

/**
 * 
 * @param {object} args The server arguments
 * @param {string} args.ip The IP the server should bind to
 * @param {number} args.port The port the server should bind to
 */
async function run({ ip = IP, port = PORT, uri = MONGO_URI }) {
    if (!uri) {
        console.error(
            `No MongoDB URI was supplied. export "MONGO_URI" environment ` +
                `variable with a valid URI`
        );
        return;
    }

    try {
        const server = await createServer({ uri });
        server.on(`error`, handleServerError);
        server.listen(port, ip, () => {
            const listenIp = ip === `0.0.0.0` ?
                `127.0.0.1` :
                ip;
            console.info(`Server listening on http://${listenIp}:${port}`);
        });
    } catch (error) {
        handleServerError(error);
        process.exit(1);
    }

    function handleServerError(error) {
        console.error(`An error occurred while initializing the server`, error);
    }
}
