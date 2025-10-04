import { Schema, Document, model, Model, PaginateModel, PaginateResult } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment-timezone'
import paginate from 'mongoose-paginate-v2';
import _plugin from "./plugin"
import mongoose from 'mongoose'
import _ from 'lodash'
export { Schema } from 'mongoose'

const { env } = process;
const tz = env.TZ || "UTC";

type DynamicMerge<T, U> = {
  [K in keyof T | keyof U]: K extends keyof T
    ? T[K]
    : K extends keyof U
    ? U[K]
    : never;
}

export const ModelFields = {
  _id: {
    type: String,
    default: uuidv4,
  },
  created_at: {
    type: Date,
    default: moment.tz(Date.now(), tz)
  },
  updated_at: {
    type: Date,
    default: moment.tz(Date.now(), tz)
  }
}
export interface EbgDocument extends Document {
  someMethod?: () => void;
  update?: (object: any) => void | boolean;
  delete?: () => void | boolean;

  // Some static function definitions?
  someStaticFunction(): void;
}

export interface EbgModel extends Model<any> {
  paginate(query?: any, options?:any): Promise<PaginateResult<any>>;
}
export interface EbgModelUpgrade extends DynamicMerge<PaginateModel<any>, Model<any>> {}


/**
 * 
 * @param defns 
 */
export const createModel = <T extends Document>(name: string, schemaDefinition: any, options?: any) => {
  // Define schema
  let _schema: Schema = (schemaDefinition instanceof Schema) ? schemaDefinition : new Schema({ ...schemaDefinition });

  // Apply the pagination plugin.
  applyPaginatePlugin(_schema);

  // Then apply our own stuff.
  // _schema.plugin(_plugin);
  _schema = applyEbgPlugin(_schema, options);

  // Define model
  const _model = model<EbgModel, PaginateModel<T>>(name, _schema);
  return _model;
}

const applyPaginatePlugin = (schema: Schema) => {
  /**
   * set the default options
   */
  paginate.paginate.options = {
    lean: true,
    leanWithId: false,
    page: 1,
    limit: 10,
    customLabels: {
      docs: 'items',
    }
  };

  schema.plugin(paginate);
}

const applyEbgPlugin = (schema: Schema, options?: any) => {
  schema.add(ModelFields);

  // Pre-save
  schema.pre('updateOne', preUpdateHandler);
  schema.pre('findOneAndUpdate', preUpdateHandler);
  schema.pre('save', preSaveHandler);
  schema.pre('validate', preSaveHandler);
  
  // schema.pre('findByIdAndUpdate', preSaveHandler);

  // const customPreHook = _.get(options, 'preUpdate', null);
  // if (typeof customPreHook === 'function') {
  //   schema.pre(/^(updateOne|save|findOneAndUpdate)/, customPreHook);
  // }
  // const customPreSaveHook = _.get(options, 'preSave', null);
  // if (typeof customPreSaveHook === 'function') {
  //   schema.pre('save', customPreSaveHook);
  // }
  // const customPreValidateHook = _.get(options, 'preValidate', null);
  // if (typeof customPreValidateHook === 'function') {
  //   schema.pre('validate', customPreValidateHook);
  // }
  
  // // Post-save
  // const customPostSave = _.get(options, 'postSave', null);
  // if (typeof customPostSave === 'function') {
  //   // schema.post(/^(updateOne|save|findOneAndUpdate|insertMany|create|insert)/, customPostSave);
  //   // schema.post('save', customPostSave);
  //   schema.post('insertMany', customPostSave);
  //   schema.post('updateOne', customPostSave);
  //   // schema.post('findOneAndUpdate', customPostSave);
  // }

  return schema;
}

/**
 * 
 * @param next 
 * @returns 
 */
const preSaveHandler = function (next) {
  this.updated_at = moment.tz(Date.now(), tz);
  next();
}

const preUpdateHandler = function (next) {
  const data = this.getUpdate();
  data.updated_at = moment.tz(Date.now(), tz);
  next();
}

export default createModel

/**
 * usage:
 * 
 * const schema = createSchema()
 * schema.
 */