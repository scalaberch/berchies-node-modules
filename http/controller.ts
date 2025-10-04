import { EBGRequest, EBGResponse } from "@modules/http/interfaces"

export interface CustomRequest<T> extends EBGRequest {
  body: T
}

const Controller = () => {

  return {
    list,
    get,
    create,
    update,
    remove
  }
}

const list = async (req: EBGRequest, res: EBGResponse) => {

}

const get = async (req: EBGRequest, res: EBGResponse) => {

}

const create = async (req: EBGRequest, res: EBGResponse) => {

}

const update = async (req: EBGRequest, res: EBGResponse) => {

}

const remove = async (req: EBGRequest, res: EBGResponse) => {

}

export default Controller;