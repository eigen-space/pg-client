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
     * Method gets pool of connections for specified database.
     * If there is no existing connection pool, it throws an error.
     */
    static getInstance(config: PoolConfig): Pool {
        PoolProvider.logger.info('getInstance', JSON.stringify(config, null, 4));
        if (!PoolProvider.pool) {
            PoolProvider.pool = new Pool(config);
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
