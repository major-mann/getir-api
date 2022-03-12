jest.mock(`mongodb`);

const uuid = require(`uuid`);
const mongodb = require(`mongodb`);
const { default: initializeDataInterface } = require(`../data.mjs`);

const { MongoClient, Db, Collection } = mongodb;

describe(`initializeDataInterface`, () => {
    let client, db, collection, results;
    beforeEach(() => {
        client = new MongoClient();
        db = new Db();
        collection = new Collection();
        results = [{
            key: 123,
            value: 456,
            count: 789,
            createdAt: new Date(),
        }];

        jest.spyOn(client, `db`).mockImplementation(() => db);
        jest.spyOn(Db.prototype, `collection`).mockImplementation(() => collection);
        jest.spyOn(mongodb, `MongoClient`).mockImplementation(() => client);
        jest.spyOn(collection, `aggregate`).mockImplementation(() => ({ toArray: () => results }));

        jest.clearAllMocks();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it(`should connect to the supplied uri`, async () => {
        const uri = `http://example.com`;

        await initializeDataInterface({ uri });

        expect(mongodb.MongoClient.mock.calls.length).toBe(1);
        expect(mongodb.MongoClient.mock.calls[0].length).toBe(1);
        expect(mongodb.MongoClient.mock.calls[0][0]).toBe(uri);
    });
    it(`should use the specified database`, async () => {
        const database = uuid.v4();

        await initializeDataInterface({ database });

        expect(client.db.mock.calls.length).toBe(1);
        expect(client.db.mock.calls[0].length).toBe(1);
        expect(client.db.mock.calls[0][0]).toBe(database);
    });
    it(`should use the specified collection`, async () => {
        const collection = uuid.v4();

        await initializeDataInterface({ collection });

        expect(db.collection.mock.calls.length).toBe(1);
        expect(db.collection.mock.calls[0].length).toBe(1);
        expect(db.collection.mock.calls[0][0]).toBe(collection);
    });
    it(`should return an object`, async () => {
        const data = await initializeDataInterface({ collection });

        expect(data && typeof data).toBe(`object`);
    });
    
    describe(`fetch`, () => {
        let fetch, args;

        beforeEach(async () => {
            ({ fetch } = await initializeDataInterface({ }));
            args = {
                startDate: new Date(Date.parse(`2010-01-01`)),
                endDate: new Date(Date.parse(`2010-01-31`)),
                minCount: 100,
                maxCount: 200,
            };
        });

        it(`should ensure "startDate" is a date`, async () => {
            const result = fetch({
                ...args,
                startDate: 123,
            });

            await expect(result).rejects.toEqual(
                expect.objectContaining({
                    message: expect.stringMatching(`startDate`)
                })
            );
        });
        it(`should ensure "endDate" is a date`, async () => {
            const result = fetch({
                ...args,
                endDate: 123,
            });

            await expect(result).rejects.toEqual(
                expect.objectContaining({
                    message: expect.stringMatching(`endDate`)
                })
            );
        });
        it(`should ensure "minCount" is a number`, async () => {
            const result = fetch({
                ...args,
                minCount: `abc`,
            });

            await expect(result).rejects.toEqual(
                expect.objectContaining({
                    message: expect.stringMatching(`minCount`)
                })
            );
        });
        it(`should ensure "maxCount" is a number`, async () => {
            const result = fetch({
                ...args,
                maxCount: `abc`,
            });

            await expect(result).rejects.toEqual(
                expect.objectContaining({
                    message: expect.stringMatching(`maxCount`)
                })
            );
        });
        it(`should pass an aggregation pipeline to the database`, async () => {
            await fetch(args);

            expect(collection.aggregate.mock.calls.length).toBe(1);
            expect(collection.aggregate.mock.calls[0].length).toBe(1);
            expect(Array.isArray(collection.aggregate.mock.calls[0][0])).toBe(true);
        });
    });

    describe(`close`, () => {
        it(`should close the database connection`, async () => {
            const { close } = await initializeDataInterface({ });

            close();

            expect(client.close.mock.calls.length).toBe(1);
        });
    });
});
