import PocketBase, { type RecordModel } from 'pocketbase';
import { PUBLIC_PB_URL } from '$env/static/public';

export const PB_BASE_URL = PUBLIC_PB_URL ?? 'https://base.seatpls.perr.dev';

/**
 * A record from the read-only `config` collection.
 * The collection has exactly two custom fields: `key` and `value`.
 */
export interface ConfigRecord extends RecordModel {
	key: string;
	value: string;
}

/**
 * Read-only access to the `config` collection, restricted to its **view** rule
 * (list / create / update / delete are all denied).
 *
 * Because only `getOne` is permitted, records are addressed by their record ID.
 * Convention: the record's ID equals its `key` value — create each config
 * record with a custom ID set to the key (e.g. ID `name_type`).
 */
export class ConfigClient {
	constructor(private readonly pb: PocketBase) {}

	/** Fetch a single record by its record ID. */
	async getById(id: string): Promise<ConfigRecord> {
		return this.pb.collection('config').getOne<ConfigRecord>(id);
	}

	/** Fetch a record by its `key` (record ID = key). Returns `undefined` when no record matches. */
	async getByKey(key: string): Promise<ConfigRecord | undefined> {
		try {
			return await this.getById(key);
		} catch {
			return undefined;
		}
	}

	/** Fetch the `value` of a `key`, or `fallback` when the key doesn't exist. */
	async getValue(key: string, fallback?: string): Promise<string | undefined> {
		return (await this.getByKey(key))?.value ?? fallback;
	}
}

/** Shared PocketBase client. */
export const pb = new PocketBase(PB_BASE_URL);

/** Read-only handle to the `config` collection. */
export const config = new ConfigClient(pb);
