import _, { sortBy } from "lodash";
import moment from 'moment-timezone'
import { EBGRequest, EBGResponse, EBGNext } from "../interfaces";

const defaultSortValue = "asc";
const allowedSortValueStrings = ["asc", "desc"];

const SORT = {
  ASCENDING: "asc",
  DESCENDING: "desc",
};
const DEFAULT_VALUES = {
  perPage: 10,
  page: 1,
};
const DEFAULT_TIME_FILTER_FIELD = 'created_at';

const getFilterParams = (query: object) => {
  const filterInput = _.get(query, "filter", "");

  return {

  }
}

const getDateFilter = (query: object) => {
  const startInput = _.get(query, "start", "");
  const endInput = _.get(query, "end", "");
  const dateBy = _.get(query, "dateBy", DEFAULT_TIME_FILTER_FIELD);

  const start = moment(startInput)
  const end = moment(endInput)
  const format = 'YYYY-MM-DD HH:mm:ss'

  return {
    start: start.isValid() ? start.format(format) : '',
    end: end.isValid() ? end.format(format) : '',
    dateBy,
  }
}

const getSortParams = (query: object) => {
  const sortByInput = _.get(query, "sortBy", ""); 
  const sortInput = _.get(query, "sort", SORT.ASCENDING);

  // Splits
  const sortBy = sortByInput.split(",").map(fld => fld.trim());
  const sortOrder = sortInput.split(",").map(fld => fld.trim().toLowerCase() === SORT.DESCENDING ? SORT.DESCENDING : SORT.ASCENDING);

  const sortObject = sortBy.reduce((list, fld, index) => {
    const value = sortOrder.length === 1 ? sortOrder[0] : _.get(sortOrder, index, SORT.ASCENDING);
    return { ...list, [fld]: value };
  }, {})

  return { sortObject };
};

const getSearchParams = (query: object) => {
  const search = _.get(query, "search", "");
  const searchBy = _.get(query, "searchBy", "");

  // Post this directly.
  return {
    search,
    searchBy
  }
};

const getPaginationParams = (query: object) => {
  const params = ["page", "perPage"];

  const data = params.reduce((obj, value) => {
    if (_.has(query, value)) {
      let objectValue = Number(_.get(query, value, 1));
      if (isNaN(objectValue) || objectValue < 1) {
        objectValue = 1;
      }
      return { ...obj, [value]: objectValue };
    } else {
      return { ...obj, [value]: DEFAULT_VALUES[value] };
    }
  }, {});

  const dateFilter = getDateFilter(query);

  return { ...data, ...dateFilter };
};

const getQueryParamsData = (req: EBGRequest) => {
  const query = _.get(req, "query", {});

  // Get all the values
  const search = getSearchParams(query);
  const pagination = getPaginationParams(query);
  const sort = getSortParams(query);

  // Assign value to query.
  req.pageQuery = {
    ...search,
    ...pagination,
    ...sort,
  };
};

const catchToDeleteParameters = (req: EBGRequest) => {
  const removeIdString = `${_.get(req.query, "removeIds", "")}`;
  const removeIds = removeIdString.split(",").filter(id => id !== '').map(id => {
    const value = id.trim();
    return isNaN(Number(value)) ? value : Number(value);
  });

  req.removeIds = removeIds;
}

export default (req: EBGRequest, res: EBGResponse, next: EBGNext) => {
  if (req.method === "GET") {
    getQueryParamsData(req);
  } else if (req.method === "DELETE") {
    catchToDeleteParameters(req);
  }

  next();
};
