const DEFAULT_STATUS = 500;

export default class ErrorServer extends Error {
    constructor(message, code, status = DEFAULT_STATUS) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
