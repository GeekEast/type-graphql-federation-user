import { UserInputError } from "apollo-server-core"
import { plainToInstance } from "class-transformer"
import { validateSync, ValidationError } from "class-validator"
import { InputType } from "type-graphql"

@InputType()
export class DTOBase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromObject<T extends DTOBase>(obj: any) {
    const instance = plainToInstance(this, obj, {
      excludeExtraneousValues: true,
      // ! don't input undefined in dto
      exposeUnsetFields: false
    })

    // validation is happening after transforming
    const errors = instance.validate(validateSync(instance))
    if (errors.length > 0) {
      throw new UserInputError(JSON.stringify(this.aggregateValidationErrors(errors), null, 2))
    }

    return instance as T
  }

  // * ====================== private method ======================
  private static aggregateValidationErrors(errors: ValidationError[]) {
    return errors.reduce((mapping, error) => {
      mapping[error.target.constructor.name + "." + error.property] = error.constraints
      return mapping
    }, {})
  }

  // * ====================== protected method ====================
  protected buildValidationError({
    target,
    property,
    constraints
  }: {
    target: object
    property: string
    constraints: string
  }): ValidationError {
    if (!target) throw new Error("target is missing")
    if (!property) throw new Error("property is missing")
    if (!constraints) throw new Error("constraints is missing")
    const validationError = new ValidationError()
    validationError.target = target
    validationError.property = property
    validationError.constraints = { [property]: constraints }
    return validationError
  }

  // override example 1
  // validate(errors: ValidationError[]): ValidationError[] {
  //   if (Object.keys(this).length === 0) {
  //     const error = this.buildValidationError({
  //       target: this,
  //       property: "all",
  //       constraints: "should have at least one filter as input"
  //     })
  //     errors.push(error)
  //   }
  //   return errors
  // }

  // override example 2
  // validate(errors: ValidationError[]): ValidationError[] {
  //   const includeAtLeastOneFilter = Object.keys(this).filter((key) => key !== "activeOnly").length === 0
  //   if (includeAtLeastOneFilter) {
  //     const error = this.buildValidationError({
  //       target: this,
  //       property: "all",
  //       constraints: "should have at least one filter as input"
  //     })
  //     errors.push(error)
  //   }

  //   return errors
  // }

  protected validate(errors: ValidationError[]): ValidationError[] {
    return errors
  }
}
