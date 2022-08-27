import { IsMongoId, IsNotEmpty } from "class-validator"
import { Field, ID, InputType } from "type-graphql"

import { DTOBase } from "../../utils/dto/base.dto"

@InputType("UserGetOne")
export class GetUserDto extends DTOBase {
  @Field(() => ID)
  @IsNotEmpty()
  @IsMongoId()
  _id: string
}
