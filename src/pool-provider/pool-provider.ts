import { Pool, PoolConfig } from 'pg';
import { Logger } from '@eigenspace/logger';

/**
 * PoolProvider manages pools of connections to database.
 * It can helps to create and close pools of connections.
 */
export class PoolProvider {
    private static pool: Pool;
    private static logger = new Logger({ component: 'PoolProvider' });

    /**
     * Method create pool and have to be called primarily
     *
     * @param config
     */
    static create(config: PoolConfig): void {
        this.pool = new Pool(config);
    }

    /**
     * Method gets pool of connections for specified database.
     * If there is no existing connection pool, it throws an error.
     */
    static get(): Pool {
        if (!PoolProvider.pool) {
            throw new Error('Create connection before using it');
        }

        return PoolProvider.pool;
    }

    /**
     * Methods closes opened connection pool.
     * If there is no opened connection pool, it simply does nothing.
     * There is no any exception in this case.
     */
    static close(): Promise<void> {
        // Do nothing if there is no pool we want to close
        if (!PoolProvider.pool) {
            this.logger.warn('close', 'not created pool');
            return Promise.resolve();
        }

        return PoolProvider.pool.end();
    }
}
