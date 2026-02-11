import { IsString, IsNumber, IsOptional, IsArray, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateNodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nodeId: string; // React Flow ID

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsNumber()
  x: number;

  @ApiProperty()
  @IsNumber()
  y: number;

  @ApiProperty()
  @IsObject()
  data: any; // { label: string, ... }

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  height?: number;
}

export class UpdateNodeDto extends PartialType(CreateNodeDto) {}
