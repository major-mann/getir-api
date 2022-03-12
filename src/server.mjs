import express from 'express';
import { v4 as uuid } from 'uuid';

import ErrorServer from './error/server.mjs';
import ErrorUser from './error/user.mjs';
import initializeDataInterface from './data.mjs';

const LENGTH_DATE = 10;

const SUCCESS = `success`;
const ERROR_STATUS_NOT_FOUND = 404;
const ERROR_STATUS_SERVER = 500;
const ERROR_CODE = {
    notFound: 10,
    missingPayload: 11,
    invalidDate: 12,
    invalidCount: 13,
    unhandled: 20,
};

/**
 * Creates a new express server that will handle any post sent to it.
 * @returns {Express} Express An express server
 */
export default async function createServer({ uri }) {
    // Create the mongo data
    const data = await initializeDataInterface({ uri });

    // Create the express app
    const app = express();

    // Handle closing of the db connection once the server
    //  is closed.
    app.on(`close`, onExpressServerClosed);

    // Parse incoming JSON body
    app.use(express.json());

    // Add the context
    app.use(attachContext);

    // We are interested in POST only
    app.post(`/records`, handleRequest);

    // Make sure we return something sane
    app.all(`*`, handleNotFound);

    return app;

    /** Handles cleanup once the server is closed */
    function onExpressServerClosed() {
        data.close();
    }

    /** Attaches a context onto the request and response objects */
    function attachContext(request, response, next) {
        request.context = response.context = { data };
        next();
    }
}

/**
 * Responds to the standard API post request
 * @param {Request} request The incoming HTTP request
 * @param {Response} response The HTTP response
 */
async function handleRequest(request, response) {
    try {
        // Make sure we are receiving something valid
        await validatePayload(request.body);

        // Fetch the results
        const records = await request.context.data.fetch({
            startDate: convertToDate(request.body.startDate),
            endDate: convertToDate(request.body.endDate, true),
            minCount: request.body.minCount,
            maxCount: request.body.maxCount,
        });

        // Return the results to the user
        response.json({
            code: 0,
            msg: SUCCESS,
            records,
        });
    } catch (error) {
        handleError(error, response);
    }
}

/**
 * Validates the received payload object
 * @param {object} payload The received payload
 */
function validatePayload(payload) {
    errorAssert(payload, new ErrorUser(`payload is missing from request`));
    
    // Validate start and end dates
    validateDateValue(`startDate`);
    validateDateValue(`endDate`);

    errorAssert(payload.startDate <= payload.endDate, new ErrorUser(`startDate cannot be greater than endDate`, ERROR_CODE.invalidDate));

    // Validate the count values
    validateIntegerValue(`minCount`);
    validateIntegerValue(`maxCount`);
    errorAssert(payload.minCount <= payload.maxCount, new ErrorUser(`minCount cannot be greater than maxCount`, ERROR_CODE.invalidCount));

    /**
     * Validates a payload date
     * @param {string} name The name of the payload property
     */
    function validateDateValue(name) {
        const value = payload[name];
        const message = `"${name}" value ${JSON.stringify(value)} is not a valid date`;
        errorAssert(typeof value === `string`, new ErrorUser(message, ERROR_CODE.invalidDate));
        errorAssert(value.length === LENGTH_DATE, new ErrorUser(message, ERROR_CODE.invalidDate));
        errorAssert(!isNaN(Date.parse(value)), new ErrorUser(message, ERROR_CODE.invalidDate));
    }

    /**
     * Validates a payload integer
     * @param {string} name The name of the payload property
     */
    function validateIntegerValue(name) {
        const value = payload[name];
        const message = `"${name}" value ${JSON.stringify(value)} is not a positive integer`;

        errorAssert(typeof value === `number`, new ErrorUser(message, ERROR_CODE.invalidCount));
        errorAssert(value >= 0, new ErrorUser(message, ERROR_CODE.invalidCount));
    }

    /** Throws the supplied error if test is false */
    function errorAssert(test, error) {
        if (!test) {
            throw error;
        }
    }
}

/**
 * Responds to a request that cannot be handled by any application
 *  module.
 * @param {Request} request The incoming HTTP request
 * @param {Response} response The HTTP response
 */
function handleNotFound(request, response) {
    response.status(ERROR_STATUS_NOT_FOUND).json({
        msg: `Not found`,
        code: ERROR_CODE.notFound,
    });
}

/**
 * Responds to an error that occurred during a request
 * @param {Error} error The error that occurred
 * @param {Response} response The HTTP response
 */
function handleError(error, response) {
    if (error instanceof ErrorUser) {
        // For user errors return the message directly
        response.status(error.status).json({
            msg: error.message,
            code: error.code,
        });
    } else {
        // Get a status and error values to return
        const status = error instanceof ErrorServer ?
            error.status :
            ERROR_STATUS_SERVER;

        const code = error instanceof ErrorServer ?
            error.code :
            ERROR_CODE.unhandled;

        // For server errors log to console but don't return the details.
        const errorId = uuid();
        // console.error(`An unhandled server error has occurred`, errorId, error);
        response.status(status).json({
            msg: `Internal server error "${errorId}"`,
            code,
        });
    }
}

/**
 * Converts the given 10 digit ISO date to a Date instance
 * @param {string} value The 10 digit ISO date
 * @param {boolean} endOfDay Whether to set the date to the end of the day
 * @returns {Date} The parsed date
 */
function convertToDate(value, endOfDay) {
    const time = endOfDay ?
        `23:59:59.999Z` :
        `00:00:00.000Z`;
    const date = new Date(Date.parse(`${value}T${time}`));
    return date;
}
