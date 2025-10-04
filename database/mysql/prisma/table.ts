/**
 * All of these are based on Prisma CRUD operations
 * https://www.prisma.io/docs/orm/prisma-client/queries/crud
 * 
 */
// import { Prisma, PrismaClient } from "@prisma/client";
//import { Prisma, PrismaClient } from "@src/database/mysql"
import moment from 'moment-timezone'
import { v4 as uuidv4 } from 'uuid';

const createdTimestampFld = 'created_at'
const updatedTimestampFld = 'updated_at'
const deletedTimestampFld = 'deleted_at'

/**
 * helping to prepare a create payload
 * 
 * @param data 
 * @param referenceFields 
 * @returns 
 */
const prepareCreatePayload = (data: any, referenceFields: any, primaryKey: string) => {
  // First check on the payload if all the attributes exist in the model reference?
  for (const payloadField in data) {
    if (!referenceFields.hasOwnProperty(payloadField)) {
      delete data[payloadField];
    }
  }

  // Create the id!
  data[primaryKey] = uuidv4();

  // Add the timestamps
  const now = generateTimestampNow();
  const timestampFields = [createdTimestampFld, updatedTimestampFld];
  for (const timestampField of timestampFields) {
    if (referenceFields.hasOwnProperty(timestampField)) {
      data[timestampField] = now;
    }
  }

  return data
}

/**
 * generates the timestamp
 * 
 * @returns 
 */
const generateTimestampNow = () => moment().toISOString()



/**
 * main class definition
 * 
 */
export class PrismaMysqlTable {

  private tableName: string;
  private dbInstance: any;
  private primaryKey: string;
  private table: any;
  public fields: object;

  constructor(dbInstance: any, tableName: string) {
    this.tableName = tableName;
    this.dbInstance = dbInstance;
    this.table = null;
    this.fields = {};
  }

  /**
   * set table instance
   * 
   * @param table 
   */
  public setTable(table: any) { this.table = table; }

  /**
   * get table instance
   * 
   * @returns 
   */
  public getTable(): any { return this.table; }

  /**
   * get the current db instance
   * 
   * @returns 
   */
  public getDbInstance(): any { return this.dbInstance }

  /**
   * get the table name
   * 
   * @returns 
   */
  public getTableName(): string { return this.tableName }


  /**
   * set primary key;
   * 
   * @param primaryKey 
   */
  public setPrimaryKey(primaryKey: string) {
    this.primaryKey = primaryKey;
  }

  /**
   * get primary key 
   * 
   * @returns 
   */
  public getPrimaryKey() {
    return this.primaryKey;
  }


  /**
   * get an item by id
   * 
   * @param id 
   * @returns 
   */
  public async get(id: string | number) {
    const entry = await this.table.findUnique({
      where: {
        [this.primaryKey]: id,
      },
    })
    return entry;
  }

  /**
   * get a set of items given a filter and sort order
   * 
   * @param where 
   * @param orderBy 
   * @returns 
   */
  public async find(where = {}, orderBy = {}) {
    return await this.table.findMany({ where, orderBy })
  }

  /**
   * get a single item given a filter and a sort order
   * 
   * @param where 
   * @param orderBy 
   * @returns 
   */
  public async findOne(where = {}, orderBy = {}) {
    // console.log(this.table)
    return await this.table.findFirst({ where, orderBy })
  }

  /**
   * get a paged list from the table given set of parameters
   * 
   * @param page 
   * @param perPage 
   * @param where 
   * @param orderBy 
   * @param postAction 
   * @returns 
   */
  public async paginate(page = 1, perPage = 5, where = {}, orderBy = {}, postAction?: Function) {
    // Get paginated items.
    const skip = (page - 1) * perPage;
    const items = await this.table.findMany({
      skip,
      take: perPage,
      where,
      orderBy
    })

    // Get data needed for proper pagination
    const totalDocs = await this.table.count({ where });
    const totalPages = Math.ceil(totalDocs / perPage);
    const nextPage = (page >= totalPages) ? page : (page + 1)
    const hasNextPage = (page < totalPages)
    const prevPage = (page > 1) ? (page - 1) : 1;
    const hasPrevPage = page > 1

    return {
      hasNextPage,
      hasPrevPage,
      items,
      limit: perPage,
      nextPage,
      page,
      pagingCounter: skip,
      prevPage,
      totalDocs,
      totalPages
    }
  }

  /**
   * create a single entry, given a certain payload
   * 
   * @param payload 
   * @returns 
   */
  public async create(payload: object) {
    const data = prepareCreatePayload(payload, this.fields, this.primaryKey)
    const newObject = await this.table.create({ data })
    return newObject;
  }

  /**
   * create multiple entries, given a lot of payload
   * 
   * @param payloads 
   * @param skipDuplicates 
   * @returns 
   */
  public async createMany(payloads: Array<object>, skipDuplicates = true) {
    const data = [];

    for (const payload of payloads) {
      const dataItem = prepareCreatePayload(payload, this.fields, this.primaryKey)
      data.push(dataItem);
    }

    await this.table.createMany({ data, skipDuplicates })
    return data;
  }

  /**
   * updates a single entry, given the entry's id
   * 
   * @param id 
   * @param data 
   * @returns 
   */
  public async update(id: string | number, data = {}) {
    const now = generateTimestampNow();
    if (this.fields.hasOwnProperty('updated_at')) {
      data['updated_at'] = now;
    }

    const updatedObject = await this.table.update({
      where: {
        [this.primaryKey]: id
      },
      data
    })

    return updatedObject
  }

  /**
   * updates multiple entries with the given payload
   * 
   * @param ids 
   * @param payload 
   */
  public async updateMany(ids: Array<string | number>, data: object) {
    const now = generateTimestampNow();
    if (this.fields.hasOwnProperty('updated_at')) {
      data['updated_at'] = now;
    }

    const updatedEntries = await this.table.updateMany({
      where: {
        [this.primaryKey]: {
          in: ids
        }
      },
      data
    })

    return updatedEntries;
  }

  /**
   * deletes an entry given an id, and some parameters
   * 
   * @param id 
   * @param hardDelete 
   * @param cascade 
   * @returns 
   */
  public async delete(id: string | number, hardDelete = false, cascade = false) {
    return await this.deleteMany([id], hardDelete, cascade);
  }


  /**
   * deletes a set of entries, given their ids.
   * 
   * @param ids 
   * @param hardDelete 
   * @param cascade 
   * @returns 
   */
  public async deleteMany(ids: Array<string | number>, hardDelete = false, cascade = false) {

    // Check if the model has a `deleted_at` field.
    const hasTimestampField = this.fields.hasOwnProperty(deletedTimestampFld)

    // If so, then check if hardDelete is set to true.
    if (hasTimestampField && !hardDelete) {
      const deletedTimestamp = generateTimestampNow();

      return await this.updateMany(ids, {
        [deletedTimestampFld]: deletedTimestamp
      });
    }

    // Otherwise, we outright delete it!
    const deleteUsersResult = await this.table.delete({
      where: {
        [this.primaryKey]: {
          in: ids
        }
      },
    })

    return deleteUsersResult
  }

  /**
   * deletes *all* the entries for this table. 
   * use this with caution!
   * 
   * @returns 
   */
  public async wipe() {
    return await this.table.deleteMany({})
  }

}