import _ from "lodash";
import { createDb, QueryTypes, Op, Model } from "@modules/database/mysql";
import { EBGRequest, EBGPaginationResponse } from "@modules/http/interfaces";
import Transaction, { enableTransactionLog } from "@modules/logs/transaction";
import { PaginateByModel, PaginateBySQL } from "./pagination"

const db = createDb();

const createApiService = (_model: any) => {
  return {
    list: async (request: EBGRequest, joins?: Array<any>) => await PaginateByModel(request, _model, joins),
    listViaSql: async (request: EBGRequest, sqlPayload: any) => await PaginateBySQL(request, sqlPayload),
    paginateViaSql: async (sql: string, queryObject: any) =>
      await _paginateViaSql(sql, _model, queryObject),
    create: async (request: EBGRequest, includePrimaryKey = false) => await _create(request, _model, includePrimaryKey),
    getById: async (objectId: number) => await _model.findByPk(objectId),
    update: async (objectId: number, request: EBGRequest) =>
      await _update(objectId, request, _model),
    remove: async (objectId: number) => await _remove(objectId, _model),
    removeMultiple: async (ids: Array<number | string>) =>
      await _removeMultiple(ids, _model),

    removeMany: async (ids: Array<number | string>) =>
      await _removeMultiple(ids, _model),
  };
};


const _paginateViaSql = async (sql: string, model: any, query: EBGRequest) => {
  // @todo clean the sql nga diri lang mag settle sa LIMIT ?, ?
  const limitSql = `${sql} LIMIT ?, ?`;

  // Get all the pre-required stuff
  const limit = Number(_.get(query, "perPage", 10));
  const page = Number(_.get(query, "page", 1));
  const offset = (page - 1) * limit;

  // Do the actual query
  const items = await db.query(limitSql, {
    type: QueryTypes.SELECT,
    model,
    replacements: [offset, limit],
  });

  const totalDocs = await model.count();
  const totalPages = totalDocs > limit ? Math.ceil(totalDocs / limit) : 1;
  const nextPage =
    totalDocs > limit ? (page + 1 === totalPages ? null : page + 1) : null;
  const hasNextPage = nextPage !== null;
  const prevPage = page === 1 ? null : page - 1;
  const hasPrevPage = prevPage !== null;

  return {
    items,
    totalDocs,
    limit,
    page,
    totalPages,
    prevPage,
    hasPrevPage,
    nextPage,
    hasNextPage,
  };
};

const _create = async (request: EBGRequest, model: any, includePrimaryKey: boolean = false) => {
  const payload = request.getModelPayloadFromBody(model, includePrimaryKey);
  const item = await model.create(payload);

  // if (enableTransactionLog) {
  //   Transaction.post('', 'post', model.getTableName(), payload);
  // }

  return item;
};

const _update = async (objectId: number, request: EBGRequest, model: any) => {
  const updateStatus: any = {
    isUpdated: true,
  };

  // Get item
  const item = await model.findByPk(objectId);
  if (item === null) {
    updateStatus.isUpdated = false;
    return updateStatus;
  }

  // Set item
  const payload = request.getModelPayloadFromBody(model);
  item.set(payload);
  await item.save();

  return updateStatus;
};

const _remove = async (objectId: number, model: any) => {
  const item = await model.findByPk(objectId);
  if (item === null) {
    return false;
  }

  await item.destroy();
  return true;
};

const _removeMultiple = async (ids: Array<number | string>, model: any) => {
  if (ids.length === 0) {
    return;
  }

  const deletePayload = {};
  deletePayload[model.primaryKeyAttribute] = ids;

  return await model.destroy({
    where: deletePayload,
  });
};

export default createApiService;
