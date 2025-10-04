import { Schema, SchemaOptions, Document, Model } from 'mongoose'
import { ModelFields } from "./model"
import moment from 'moment-timezone'

const { env } = process;
const tz = env.TZ || "UTC";

/**
 * 
 * @param next 
 * @returns 
 */
const preSaveHandler = function (next) {
  this.updated_at = moment.tz(Date.now(), tz);
  return next();
}

// export default plugin;
export default function (schema: Schema, options?: SchemaOptions) {
  schema.add(ModelFields);

  // Pre-save
  schema.pre('save', preSaveHandler);

  // Define object methods
  schema.methods.update = async function (object: any) {
    await this.constructor.findOneAndUpdate({ _id: this._id }, { $set: object });
  }
  schema.methods.delete = async function () {
    return await this.remove();
  }

  // Define static functions
  schema.statics.findOneOrCreate = async function () {
    return 69;
  }
  schema.statics.getCount = function () {
    return this.countDocuments();
  }
  schema.statics.deleteAll = function () {
    return this.deleteMany({});
  }

  schema.statics.findOneOrCreate = async function(condition, document) {
    const found = this.findOne(condition);
    if (found === null) {
      const created = this.create(document);
      return created;
    }
    return found;
  }
}