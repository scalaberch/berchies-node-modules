import { EbgModel, EbgModelUpgrade } from "./database/mongo/model";
import _ from 'lodash'

/**
 * 
 * @param model 
 * @param filter 
 * @param options 
 * @param transform 
 * @returns 
 */
const paginate = async (model: EbgModel, filter?: object, options?: object, transform?: Function) => {
  const pagination = await model.paginate(filter, options);

  if (typeof transform === "function") {
    const items = _.get(pagination, 'items', []) as Array<any>;
    pagination.items = await transform(items);
  }

  return pagination;
}

export default paginate;