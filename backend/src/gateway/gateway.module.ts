import { Module, Global } from '@nestjs/common';
import { GraphGateway } from './graph.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from '../schema/session.schema';
import { Project, ProjectSchema } from '../schema/project.schema';
import { Access, AccessSchema } from '../schema/access.schema';
import { User, UserSchema } from '../schema/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Access.name, schema: AccessSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [GraphGateway],
  exports: [GraphGateway],
})
export class GatewayModule {}
