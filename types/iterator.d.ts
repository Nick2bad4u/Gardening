export {};

declare global {
    interface IteratorConstructor {
        /**
         * Native in the Node 26 build runtime; not yet declared by TypeScript
         * 6.
         */
        concat: <T>(
            ...iterables: Iterable<T>[]
        ) => IteratorObject<T, undefined>;
    }
}
