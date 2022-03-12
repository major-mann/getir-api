module.exports = {
    testRegex: `(/__tests__/.*|(\\.|/)(test|spec|unit))\\.(js?|mjs?)$`,
    testPathIgnorePatterns: [`<rootDir>/build/`, `<rootDir>/node_modules/`],
    moduleFileExtensions: [`js`, `mjs`],
    transform: {
        '^.+\\.m?js$': [`babel-jest`, { configFile: './babel.config.json' }]
    },
};
