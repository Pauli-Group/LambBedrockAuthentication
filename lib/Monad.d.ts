export default class Monad<T> {
    private _value;
    constructor(value: T);
    bind<U>(transform: (value: T) => Monad<U>): Monad<U>;
    static of<T>(value: T): Monad<T>;
    unwrap(): T;
}
