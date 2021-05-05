import { DbClientConfig } from './db-client-config';
import { Logger } from '@eigenspace/logger';
import { AnyDictionary, Guid } from '@eigenspace/common-types';
import { ObjectUtils, StringUtils } from '@eigenspace/utils';
import { Entity } from '../entities';
import { SaveMode } from '../enums';
import { PoolProvider } from '../pool-provider';

export class BaseDbClient<T extends Entity> {
    protected logger: Logger;

    constructor(private config: DbClientConfig, componentName: string) {
        const component = `${componentName}|db table: ${this.config.table}`;
        this.logger = new Logger({ component });
    }

    // noinspection JSUnusedGlobalSymbols
    getAll(): Promise<T[]> {
        return this.query<T>(`
            select *
            from ${this.getTableNameWithScheme()}
        `);
    }

    // noinspection JSUnusedGlobalSymbols
    async count(): Promise<number> {
        const result = await this.querySingle<{ count: number }>(`
            select count(*)::int
            from ${this.getTableNameWithScheme()}
        `);
        return result.count;
    }

    async save(entities: T[], mode = SaveMode.UPDATE_LAST_ENTITY): Promise<T[]> {
        return Promise.all(entities.map(item => {
            const itemWithoutUndefinedFields = ObjectUtils.filterBasicTypes(item);
            const nonUndefinedEntries = Object.entries(itemWithoutUndefinedFields);

            switch (mode) {
                case SaveMode.INSERT:
                    return this.insertOne(nonUndefinedEntries);
                case SaveMode.UPDATE_LAST_ENTITY:
                    return this.patchOne(item, nonUndefinedEntries);
                default:
                    this.logger.warn('unknown type of save mode:', mode);
                    return Promise.resolve(item);
            }
        }));
    }

    // noinspection JSUnusedGlobalSymbols
    deleteAll(): Promise<void> {
        // noinspection SqlConstantCondition
        return this.querySingle<void>(`
            delete
            from ${this.getTableNameWithScheme()}
            where 1 = 1
        `);
    }

    find(entity: T): Promise<T | undefined> {
        this.logger.info('find', 'find:', JSON.stringify(entity));

        if (!entity.id && !this.config.uniqueSelector) {
            this.logger.info('find', 'entity is not found, there is no id or unique selector');
            return Promise.resolve(undefined);
        }

        if (entity.id) {
            this.logger.info('entity has id, try to find it by id:', entity.id);
            return this.findById(entity.id);
        }

        this.logger.info('find', 'entity has no id, try to find it by unique selector');

        const entries = Object.entries(entity);
        // @ts-ignore In this case uniqueSelector can not be undefined because of checks above
        const uniqueSelector = entries.filter(([key]) => this.config.uniqueSelector.includes(key));

        const { fields, values, placeholders } = this.getQueryParamSet(uniqueSelector);
        const conditions = placeholders.map((placeholder, index) => `${fields[index]}=${placeholder}`);

        this.logger.info('find', `unique selector: [${conditions.join(' and ')}] with values: [${values.join(', ')}]`);

        // noinspection SqlResolve
        return this.querySingle<T>(
            `
                select * from ${this.getTableNameWithScheme()}
                where ${conditions.join(' and ')}
                order by "modified_at" desc
                limit 1;
            `,
            values
        );
    }

    // noinspection JSMethodCanBeStatic
    protected async query<R>(query: string, params: QueryParam[] = []): Promise<R[]> {
        const pool = PoolProvider.get();
        const result = await pool.query(query, params);
        return this.convertEntitiesFromDbToApp<R>(result.rows);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected async querySingle<R>(query: string, params: any[] = []): Promise<R> {
        const result = await this.query<R>(query, params);
        return result[0];
    }

    private insertOne(entriesToSave: DbEntry[]): Promise<T> {
        const { fields, values, placeholders } = this.getQueryParamSet(entriesToSave);
        const stringifiedFields = fields.join(', ');
        this.logger.info('insertOne', `insert [${stringifiedFields}] with values [${values.join(', ')}]`);

        return this.querySingle<T>(
            `
                insert into ${this.getTableNameWithScheme()} (${stringifiedFields})
                values (${placeholders.join(',')})
                returning *
            `,
            values
        );
    }

    private async patchOne(entity: T, entriesToSave: DbEntry[]): Promise<T> {
        const itemInDb = await this.find(entity);

        if (!itemInDb) {
            return this.insertOne(entriesToSave);
        }

        const { fields, values, placeholders } = this.getQueryParamSet(entriesToSave);
        this.logger.info('patchOne', `patch [${fields.join(', ')}] with values [${values.join(', ')}]`);
        const fieldsToUpdate = placeholders.map((placeholder, index) => `${fields[index]}=${placeholder}`);

        // noinspection SqlResolve
        return this.querySingle<T>(
            `
                update ${this.getTableNameWithScheme()}
                set ${fieldsToUpdate.join(', ')}
                where id = $${placeholders.length + 1}
                returning *;
            `,
            [...values, itemInDb.id]
        );
    }

    private findById(id: Guid): Promise<T> {
        // noinspection SqlResolve
        return this.querySingle<T>(
            `
                select * from ${this.getTableNameWithScheme()}
                where id = $1
            `,
            [id]
        );
    }

    /**
     * Returns full name to address table,
     * i.e. scheme name + table (entity) name.
     */
    private getTableNameWithScheme(): string {
        return `public."${this.config.table}"`;
    }

    // noinspection JSMethodCanBeStatic
    /**
     * Prepares basic parts of query:
     *      - fields, to use as table fields;
     *      - values, to filter or update appropriate fields;
     *      - placeholder. to build query though prepare statements
     *        mechanism, i.e. safe placeholders to put values
     *        to query
     * for table we want query.
     *
     * @param entries Represents list pairs of [field, value]
     *      we want to use in query.
     * @return Basic parts of query.
     *      For example,
     *          - fields: ['"sourceId"', '"instrumentId"', '"value"']
     *          - values: ['guid', 'guid', 1718.5]
     *          - placeholders: ['$1', '$2', '$3']
     */
    private getQueryParamSet(entries: DbEntry[]): QueryParamSet {
        const fields = entries.map(([key]) => `"${StringUtils.toSnakeCase(key)}"`);
        const values = entries.map(([, value]) => value);
        const placeholders = entries.map(({}, index) => `$${index + 1}`);

        return { fields, values, placeholders };
    }

    // noinspection JSMethodCanBeStatic
    private convertEntitiesFromDbToApp<R>(dbEntities: AnyDictionary[]): R[] {
        return ObjectUtils.convertObjectKeys(dbEntities, StringUtils.toCamelCase);
    }
}

interface QueryParamSet {
    fields: DbField[];
    values: DbValue[];
    placeholders: string[];
}

declare type DbEntry = [DbField, DbValue];
declare type DbField = string;
// We really can obtain any type to save it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type DbValue = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type QueryParam = any;