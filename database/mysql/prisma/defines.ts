// import { Prisma, PrismaClient } from "@prisma/client"

export const templateModelPath = './modules/database/mysql/prisma/template.ts.txt'
export const mysqlSrcBasePath = './src/models/mysql'
export const mysqlClientPath = 'database/mysql'
export const schemaFile = `${mysqlSrcBasePath}/mysql.prisma`
export const timestampFields = ['created_at', 'updated_at']
export const deleteTimestampField = 'deleted_at'

// Define a runtime-to-type mapping
export const tableTypeMap = {} as const;

// define custom class table
export class MysqlTable {
  public create = async (payload: object) => {
    console.log("hello from parent!")
    // const referenceFields = this.model.fields;
    // const data = prepareCreatePayload(payload, referenceFields, this.primaryKey)
    // const newObject = await this.table.create({ data })
    // return newObject;
  }
  createMany = async (payloads: Array<object>, skipDuplicates = true) => {
    // const data = [];
    // const referenceFields = this.model.fields;

    // for (const payload of payloads) {
    //   const dataItem = prepareCreatePayload(payload, referenceFields, this.primaryKey)
    //   data.push(dataItem);
    // }

    // await this.table.createMany({ data, skipDuplicates })
    // return data;
  }
}


export class MySqlTable1 {

  private table;
  private model;
  private tableName: string = '';
  private primaryKey: string = '';

  constructor(dbInstance: any, tableName: string, modelReference: any) {

    if (!modelReference.hasOwnProperty(tableName)) {
      throw `Table ${tableName} does not exist in the schema!!!`;
    }

    // this.table = _.get(dbInstance, tableName);
    // // this.table = dbInstance[tableName];
    // this.model = _.get(modelReference, tableName);
    // this.tableName = tableName;

    // Do some more helper?
    this.primaryKey = this.model.primaryKey;
  }

  getTableName = () => this.tableName
  getTable = () => this.table
  getModelStructure = () => this.model
  getPrimaryKey = () => this.primaryKey

  public get = async (id: string | number) => {
    const entry = await this.table.findUnique({
      where: {
        [this.primaryKey]: id,
      },
    })

    return entry;
  }

  public create = async (payload: object) => {
    const referenceFields = this.model.fields;
    // const data = prepareCreatePayload(payload, referenceFields, this.primaryKey)
    // const newObject = await this.table.create({ data })
    // return newObject;
  }

  createMany = async (payloads: Array<object>, skipDuplicates = true) => {
    const data = [];
    const referenceFields = this.model.fields;

    for (const payload of payloads) {
      // const dataItem = prepareCreatePayload(payload, referenceFields, this.primaryKey)
      // data.push(dataItem);
    }

    await this.table.createMany({ data, skipDuplicates })
    return data;
  }

  public find = (where: object, orderBy: object) => this.table.findMany({ where, orderBy })

  public findOne = (where: object, orderBy: object) => this.table.findFirst({ where, orderBy })

  paginate = async (page = 1, perPage = 5, where = {}, orderBy = {}, postAction?: Function) => {

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

  update = async (id: string | number, data: object) => {
    const referenceFields = this.model.fields;
    const now = 1; //generateTimestampNow();
    if (referenceFields.hasOwnProperty('updated_at')) {
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

  // @todo
  updateMany = (ids: Array<string | number>, payload: object) => {
  }

  delete = async (id: string | number, hardDelete = false, cascade = false) => {

    // Check if the model has a `deleted_at` field.
    const referenceFields = this.model.fields;
    const hasTimestampField = referenceFields.hasOwnProperty(deleteTimestampField)

    // If so, then check if hardDelete is set to true.
    if (hasTimestampField && !hardDelete) {
      const ts = 1; //generateTimestampNow();
      return await this.update(id, { [deleteTimestampField]: ts })
    }

    // Otherwise, we outright delete it!
    const deleteUser = await this.table.delete({
      where: {
        [this.primaryKey]: id
      },
    })

    return deleteUser;
    
  }

  // @todo
  deleteMany = (ids: Array<string | number>) => {
  }

  wipe = () => this.table.deleteMany({})

}

export default {
}