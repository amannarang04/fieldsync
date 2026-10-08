import Dexie, { type Table } from 'dexie';
export type CachedForm={id:string;title:string;versions:{id:string;version:number;title:string;fields:any[]}[]};
export type LocalResponse={clientId:string;formVersionId:string;formTitle:string;answers:Record<string,unknown>;collectedAt:string;lat?:number;lng?:number;status:'PENDING'|'SYNCING'|'SYNCED'|'FAILED'|'REJECTED';reasons?:string[];attempts:number};
class FieldSyncDB extends Dexie { forms!:Table<CachedForm,string>; outbox!:Table<LocalResponse,string>; constructor(){super('fieldsync');this.version(1).stores({forms:'id',outbox:'clientId,status,collectedAt'});} }
export const db=new FieldSyncDB();
