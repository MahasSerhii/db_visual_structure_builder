import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { validate } from './common/env.validation';
import { GraphModule } from './controllers/graph/graph.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuthModule } from './controllers/auth/auth.module';
import { ProjectsModule } from './controllers/projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ProjectsModule,
    GraphModule,
    GatewayModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
