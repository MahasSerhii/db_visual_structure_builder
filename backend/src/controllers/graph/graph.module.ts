import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Node, NodeSchema } from '../../schema/node.schema';
import { Edge, EdgeSchema } from '../../schema/edge.schema';
import { Comment, CommentSchema } from '../../schema/comment.schema';
import { History, HistorySchema } from '../../schema/history.schema';
import { Project, ProjectSchema } from '../../schema/project.schema';
import { User, UserSchema } from '../../schema/user.schema';
import { Access, AccessSchema } from '../../schema/access.schema';
import { GraphService } from './graph.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Node.name, schema: NodeSchema },
      { name: Edge.name, schema: EdgeSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: History.name, schema: HistorySchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: Access.name, schema: AccessSchema },
    ]),
  ],
  controllers: [GraphController],
  providers: [GraphService],
})
export class GraphModule {}
