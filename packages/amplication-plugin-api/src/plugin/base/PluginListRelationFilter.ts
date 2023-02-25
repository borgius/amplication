/*
------------------------------------------------------------------------------ 
This code was generated by Amplication. 
 
Changes to this file will be lost if the code is regenerated. 

There are other ways to to customize your code, see this doc to learn more
https://docs.amplication.com/how-to/custom-code

------------------------------------------------------------------------------
  */
import { InputType, Field } from "@nestjs/graphql";
import { ApiProperty } from "@nestjs/swagger";
import { PluginWhereInput } from "./PluginWhereInput";
import { ValidateNested, IsOptional } from "class-validator";
import { Type } from "class-transformer";

@InputType()
class PluginListRelationFilter {
  @ApiProperty({
    required: false,
    type: () => PluginWhereInput,
  })
  @ValidateNested()
  @Type(() => PluginWhereInput)
  @IsOptional()
  @Field(() => PluginWhereInput, {
    nullable: true,
  })
  every?: PluginWhereInput;

  @ApiProperty({
    required: false,
    type: () => PluginWhereInput,
  })
  @ValidateNested()
  @Type(() => PluginWhereInput)
  @IsOptional()
  @Field(() => PluginWhereInput, {
    nullable: true,
  })
  some?: PluginWhereInput;

  @ApiProperty({
    required: false,
    type: () => PluginWhereInput,
  })
  @ValidateNested()
  @Type(() => PluginWhereInput)
  @IsOptional()
  @Field(() => PluginWhereInput, {
    nullable: true,
  })
  none?: PluginWhereInput;
}
export { PluginListRelationFilter };
