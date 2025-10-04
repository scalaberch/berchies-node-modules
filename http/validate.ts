import { NextFunction, Request, Response } from "express";
import { checkSchema } from 'express-validator'
import { outputError } from '../http/handlers'

interface ValidationError {
  path?: string
}

const Validate = (rules) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    const results = await checkSchema(rules, ['body']).run(request);
    const fieldErrors: object = {};
    let erroredFieldCount: number = 0;
    let genericErrorMsg: string = '';

    for (const result of results) {
      if (result.isEmpty()) {
        continue;
      }

      const errors = result.array();
      for (const fieldError of errors) {
        const fieldPath = fieldError['path'] || null;
        if (fieldPath === null) {
          continue;
        }

        if (!fieldErrors.hasOwnProperty(fieldPath)) {
          fieldErrors[fieldPath] = [];
          erroredFieldCount++
        }
        if (genericErrorMsg === '') {
          genericErrorMsg = fieldError.msg;
        }

        fieldErrors[fieldPath].push({
          errorMessage: fieldError.msg,
          inputValue: fieldError['value']
        });
      }
    }

    if (erroredFieldCount > 0) {
      if (erroredFieldCount > 1) {
        genericErrorMsg += ` (and ${erroredFieldCount - 1} other${(erroredFieldCount - 1) === 1 ? '' : 's'})`
      }
      return outputError(response, genericErrorMsg, { fields: fieldErrors });
    }

    next();
  }
}

export default Validate;