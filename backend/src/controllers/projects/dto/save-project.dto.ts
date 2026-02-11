import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsObject()
  project: {
    id: string; // roomId or _id
    name?: string;
    author?: string;
    role?: string;
    url?: string;
  };
}
