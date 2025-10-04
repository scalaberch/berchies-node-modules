import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface EbgMysqlModelAttributes {
}

class EbgMysqlModel<
  T extends EbgMysqlModelAttributes,
  TCreation extends Optional<T, any>
> extends Model<T, TCreation> {

  constructor(...args) {
    super(...args);
  }

  /**
   * get an entry by primary key
   * 
   * @returns 
   */
  public static async getByPrimaryKey<
    T extends EbgMysqlModelAttributes,
    TCreation extends Optional<T, any>,
    M extends EbgMysqlModel<T, TCreation>
  >(
    this: { new(...args: any[]): M } & typeof EbgMysqlModel<T, TCreation>, // Corrected 'this' type
    primaryKey: any
  ): Promise<M | null> {
    return this.findByPk(primaryKey); // Corrected usage
  }



  static sample() {
    console.log("hi!");


    return EbgMysqlModel.create({})
  }

}

export default EbgMysqlModel