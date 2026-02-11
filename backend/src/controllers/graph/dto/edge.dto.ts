import { IsString, IsBoolean, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEdgeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  edgeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  target: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sourceProp?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  targetProp?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  animated?: boolean;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  style?: any;
}
