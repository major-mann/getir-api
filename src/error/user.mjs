const DEFAULT_STATUS = 400;

export default class ErrorUser extends Error {
    constructor(message, code, status = DEFAULT_STATUS) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
