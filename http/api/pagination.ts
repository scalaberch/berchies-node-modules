import _ from "lodash"
import { EBGRequest, EBGPaginationResponse } from "@modules/http/interfaces";
import { DataTypes, STRING, TEXT, Op, Sequelize } from "sequelize";
import { createDb, db as mysql, QueryTypes, Model, getTableAttributes } from "@modules/database/mysql";

const isContainingSearchParameters = (searchObject: object) => {
  if (searchObject === null || typeof searchObject === 'undefined') {
    return false;
  }

  return Object.keys(searchObject).length > 0 
}

const createPaginationOutput = (result: any, page: number, perPage: number, columns = []) => {
  const { count: totalDocs, rows: items } = result;

  // Get total pages
  let totalPages = totalDocs > 0 ? 1 : 0;
  if (totalDocs > perPage && totalDocs > 0) {
    totalPages = Math.ceil(totalDocs / perPage);
  }

  // Get previous page status
  let prevPage = null;
  if (page > totalPages) {
    prevPage = totalPages;
  } else if (page > 1) {
    prevPage = page - 1;
  }

  let nextPage = page + 1;
  if (page >= totalPages) {
    nextPage = null;
  }

  return {
    items,
    columns,
    page,
    totalPages,
    limit: items.length,
    totalDocs,
    prevPage,
    hasPrevPage: prevPage !== null,
    nextPage,
    hasNextPage: nextPage !== null,
  };
};

const fetchAllJoins = (joins: Array<any>, searchObject: object, mainModel: any) => {
  if (typeof joins === 'undefined') {
    return null;
  }
  if (joins.length === 0) {
    return null;
  }

  const mainTableName = mainModel.getTableName();  
  const include = joins.map(joinChild => {
    const { model, on: includeOnArray } = joinChild;
    const fieldAlias = _.get(joinChild, 'fieldAlias', {});

    // Check for aliases.
    let attributes = null
    if (Object.keys(fieldAlias).length > 0) {
      attributes = [];
      for (const baseField in fieldAlias) {
        const aliasField = fieldAlias[baseField];
        attributes.push([baseField, aliasField]);
      }
    }

    // Get the filter here.
    const filter = getWhereFilterByModel(model, searchObject, true)

    // Make the join here
    let on = null
    if (Array.isArray(includeOnArray) && includeOnArray.length === 3) {
      const [mainField, operator, secondaryField] = includeOnArray;

      // on = {
      //   [`$${mainTableName}.${mainField}$`]: { 
      //     [Op.eq]: Sequelize.col(`${model.options.name.plural}.${secondaryField}`) 
      // }}

      on = {
        [`$${mainModel.name}.${mainField}$`]: { 
          [Op.eq]: Sequelize.col(`${model.options.name.plural}.${secondaryField}`) 
      }}
    }
    
    // Get the actual where filter and output them.
    const where = Object.keys(filter).length > 0 ? filter : null;
    return { model, where, on, attributes }
  })

  return include;
}

const getWhereFilterByModel = (model: any, searchObject: object, includeTableName = false) => {
  const where = {};

  if (!isContainingSearchParameters(searchObject)) {
    return where;
  }

  const modelName = model.options.name.plural;
  const attributes = model.getAttributes();
  const attributeList = Object.keys(attributes).map(attr => {
    return includeTableName ? `${modelName}.${attr}` : attr;
  });

  for (const field in searchObject) {

    // @todo: cater for aliased attributes
    const isInAttributeList = attributeList.indexOf(field) >= 0;
    const isInAliasAttributes = false;

    if (isInAttributeList) {
      const fieldName = includeTableName ? field.replace(`${modelName}.`, '') : field;
      const attrType = attributes[fieldName].type;

      if (attrType instanceof STRING || attrType instanceof TEXT) {
        where[fieldName] = {
          [Op.like]: `%${searchObject[field]}%`,
        };
      } else {
        where[fieldName] = searchObject[field];
      }
    }
  }

  return where;
}

const fetchAllSortParameters = (sortObject: any, joins: Array<any>) => {
  const order = [];

  for (const sortKey in sortObject) {
    const sortValue = sortObject[sortKey];
    
    // Do a split just in case there's some joined tables.
    const keySplit = sortKey.split(".");
    if (keySplit.length === 2) {
      const [modelName, modelField] = keySplit;
      const targetModel = joins.filter(join => join.model.options.name.plural === modelName);
      if (targetModel.length > 0) {
        const payload = [{ model: targetModel[0].model, as: modelName }, modelField, sortValue];
        order.push(payload);
      }
    } else {
      if (sortKey !== '') {
        order.push([sortKey, sortValue]);
      }
      
    }
    
  }

  return order;
}

export const PaginateByModel = async (request: EBGRequest, model: any, joins?: Array<any>) => {
  const { pageQuery } = request;
  const { page, perPage, search, searchObject, sortObject } = pageQuery;

  // Get all sorting and limiting parameters for query.
  const order = fetchAllSortParameters(sortObject, joins);
  const offset = (page - 1) * perPage;

  // Get all searching parameters for query.
  const where = getWhereFilterByModel(model, searchObject, false);

  // Get all include dataset.
  const include = fetchAllJoins(joins, searchObject, model);

  // If model, then just return the query output
  const queryParam = {
    where,
    order,
    offset,
    limit: perPage,
    include,
    raw: true,
    // nest: true
  };

  console.log(queryParam);

  const result = await model.findAndCountAll(queryParam);
  return createPaginationOutput(result, page, perPage);
};

export const PaginateBySQL = async (request: EBGRequest, sqlPayload: any) => {
  const qb = mysql();
  const { pageQuery } = request;
  const { page, perPage, search, searchObject, sortObject, sort, sortBy } = pageQuery;
  const { mainTable, joinTables } = sqlPayload;

  // Get the attributes list.
  const attributes = { [mainTable]: await getTableAttributes(mainTable) };

  // Set up base query.
  const baseQuery = qb(mainTable);
  for(const tbl of joinTables) {
    const onJoin = tbl.on;
    baseQuery.leftJoin(tbl.tableName, function() {
      this.on(`${mainTable}.${onJoin[0]}`, onJoin[1], `${tbl.tableName}.${onJoin[2]}`)
    });

    // Append to attributes list
    attributes[tbl.tableName] = await getTableAttributes(tbl.tableName)
  }

  // Add the where filter.
  if (isContainingSearchParameters(searchObject)) {
    for (const field in searchObject) {
      if (field === '') {
        continue;
      }

      // @todo: cater for string filter (i.e. where like %str%)


      // find parent table.
      const parentTable = Object.keys(attributes).filter(attr => attributes[attr].filter(fld => fld === field).length > 0)
      if (parentTable.length > 0) {
        baseQuery.where(`${parentTable[0]}.${field}`, searchObject[field])
      }
      
    }
  }

  // Get the count first.
  const { mainCount } = await baseQuery.clone().count('* as mainCount').first();

  // Add the order
  for (const sortKey in sortObject) {
    const sortByItem = _.get(sortObject, sortKey, '') as string;
    if (sortByItem !== '') {
      baseQuery.orderBy(sortKey, sortObject[sortKey]);
    }
    
  }

  // Add the limiters
  const _offset = (page - 1) * perPage;
  baseQuery.limit(perPage).offset(_offset);

  // Exeucte said query
  // const string = baseQuery.toString();
  // console.log(string);
  const _results = await baseQuery;
  return createPaginationOutput({ rows: _results, count: mainCount }, page, perPage);

}

export default PaginateByModel
