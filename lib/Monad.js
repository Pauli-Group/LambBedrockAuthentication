"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Monad {
    constructor(value) {
        this._value = value;
    }
    bind(transform) {
        return transform(this._value);
    }
    static of(value) {
        return new Monad(value);
    }
    unwrap() {
        return JSON.parse(JSON.stringify(this._value));
    }
}
exports.default = Monad;
