import assert from 'assert';
import { MongoClient } from 'mongodb';

const DATABASE = `getir-case-study`;
const COLLECTION = `records`;

/**
 * Initializes a mongodb connection then creates and returns a data interface
 *   which can be used to query the records
 * @param {object} args The initialization arguments
 * @param {object} args.uri The uri of the mongo instance
 * @param {object} args.database The name of the database to connect to
 * @param {object} args.collection The name of the collection in the database
 *                                 that holds the records
 * @returns {object} A data interface which can fetch the the records
 */
export default async function initializeDataInterface({ uri, database = DATABASE, collection = COLLECTION }) {
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(database);
    const records = db.collection(collection);

    return { fetch, close: () => client.close() };

    async function fetch({ startDate, endDate, minCount, maxCount }) {
        assert(startDate instanceof Date, `startDate MUST be a date`);
        assert(endDate instanceof Date, `endDate MUST be a date`);
        assert(minCount >= 0, `minCount MUST be a positive integer`);
        assert(maxCount >= 0, `maxCount MUST be a positive integer`);

        const result = records.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                }
            },
            { $unwind: `$counts` },
            {
                $group: {
                    _id: `$_id`,
                    key: { $first: `$key` },
                    value: { $first: `$value` },
                    createdAt: { $first: `$createdAt` },
                    count: { $sum: `$counts` }
                }
            },
            {
                $match: {
                    count: { $gte: parseInt(minCount), $lte: parseInt(maxCount) },
                }
            },
        ]);

        const results = await result.toArray();
        return results.map((result) => {
            return {
                key: result.key,
                createdAt: result.createdAt,
                totalCount: result.count,
            };
        });
    }
}
