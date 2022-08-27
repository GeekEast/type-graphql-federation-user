import { Expose } from "class-transformer"
import { IsMongoId } from "class-validator"
import { Field, ID, ObjectType } from "type-graphql"

import { DTOBase } from "../../utils/dto/base.dto"

@ObjectType()
export class UserEntity extends DTOBase {
  @Field(() => ID)
  @IsMongoId()
  @Expose()
  _id: string
}
