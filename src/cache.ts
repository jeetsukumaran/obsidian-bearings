type CacheContainer = Record<symbol, Map<string, any>>;


export function EncacheFn(target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const cache = new Map<string, any>();

    descriptor.value = function (...args: any[]) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = originalMethod.apply(this, args);
        cache.set(key, result);
        return result;
    };

    return descriptor;
}

export function Encache(target: any, propertyName: string, descriptor: PropertyDescriptor): PropertyDescriptor | void {
    const originalMethod = descriptor.value;
    const cacheKey: symbol = Symbol.for(propertyName); // Unique symbol for each property

    descriptor.value = function(...args: any[]) {
        // Ensure cache storage exists on the instance
        if (!(this as any).cacheStorage) {
            (this as any).cacheStorage = {};
        }

        // Initialize a map for this particular method, if it doesn't already exist
        if (!((this as any).cacheStorage[cacheKey])) {
            (this as any).cacheStorage[cacheKey] = new Map<string, any>();
        }

        const cache: Map<string, any> = (this as any).cacheStorage[cacheKey];
        const argKey: string = JSON.stringify(args); // Serialize arguments to use as a map key

        if (!cache.has(argKey)) {
            const result = originalMethod.apply(this, args);
            cache.set(argKey, result);
            return result;
        }
        return cache.get(argKey);
    };

    return descriptor;
}

export class CacheManager {
    cacheStorage: CacheContainer;

    constructor() {
        this.cacheStorage = {};
    }

    registerCache(propertyName: string) {
        const symbol = Symbol.for(propertyName);
        this.cacheStorage[symbol] = new Map<string, any>();
    }

    invalidateCache(propertyName?: string) {
        if (propertyName) {
            const symbol = Symbol.for(propertyName);
            if (this.cacheStorage[symbol]) {
                this.cacheStorage[symbol].clear();
            }
        } else {
            Object.getOwnPropertySymbols(this.cacheStorage).forEach(symbol => {
                this.cacheStorage[symbol].clear();
            });
        }
    }
}

