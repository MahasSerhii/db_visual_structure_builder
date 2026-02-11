import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../../schema/project.schema';
import { Access, AccessSchema } from '../../schema/access.schema';
import { Node, NodeSchema } from '../../schema/node.schema';
import { Edge, EdgeSchema } from '../../schema/edge.schema';
import { Comment, CommentSchema } from '../../schema/comment.schema';
import { History, HistorySchema } from '../../schema/history.schema';
import { User, UserSchema } from '../../schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Access.name, schema: AccessSchema },
      { name: Node.name, schema: NodeSchema },
      { name: Edge.name, schema: EdgeSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: History.name, schema: HistorySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
