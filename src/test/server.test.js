// Mock data.mjs
// Select random unused port (0)
// Start server

const request = require(`supertest`);

const mockInterface = {
    fetch: jest.fn(() => Promise.resolve([{
        key: 123,
        createdAt: new Date(),
        totalCount: 456,
    }])),
    close: jest.fn(),
};

jest.mock(`../data.mjs`,
    () => () => mockInterface
);

const { default: createServer } = require(`../server.mjs`);

describe(`server`, () => {
    let server, args;

    beforeAll(async () => {
        server = await createServer({ });
        args = {
            startDate: `2010-01-01`,
            endDate: `2010-01-31`,
            minCount: 100,
            maxCount: 200,
        };
    });

    it(`should ensure startDate is a valid ISO date part`, async () => {
        const response = await request(server)
            .post('/records')
            .send({
                ...args,
                startDate: `2022`
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/u)
            .expect(400);

        expect(response.body.msg).toMatch(`startDate`);
    });

    it(`should ensure endDate is a valid ISO date part`, async () => {
        const response = await request(server)
            .post('/records')
            .send({
                ...args,
                endDate: `2022`
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/u)
            .expect(400);

        expect(response.body.msg).toMatch(`endDate`);
    });

    it(`should ensure startDate is less than endDate`, async () => {
        const response = await request(server)
            .post('/records')
            .send({
                ...args,
                startDate: `2020-01-01`,
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/u)
            .expect(400);

        expect(response.body.msg).toMatch(/startDate.*endDate/u);
    });

    it(`should ensure endDate is set to the end of day`, async () => {
        const endDate = `2022-01-01`;
        await request(server)
            .post('/records')
            .send({
                ...args,
                endDate,
            });

        expect(mockInterface.fetch.mock.calls.length).toBe(1);
        expect(mockInterface.fetch.mock.calls[0].length).toBe(1);
        expect(mockInterface.fetch.mock.calls[0][0].endDate).toEqual(new Date(Date.parse(`${endDate}T23:59:59.999Z`)));
    });

    it(`should ensure minCount is a positive number`, async () => {
        const response = await request(server)
            .post('/records')
            .send({
                ...args,
                minCount: -100,
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/u)
            .expect(400);

        expect(response.body.msg).toMatch(/minCount/u);
    });
    it(`should ensure maxCount is a positive number`, async () => {
        const response = await request(server)
            .post('/records')
            .send({
                ...args,
                maxCount: -100,
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/u)
            .expect(400);

        expect(response.body.msg).toMatch(/maxCount/u);
    });
});
