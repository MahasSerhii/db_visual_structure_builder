import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProjectGuard } from '../../common/guards/project.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../schema/access.schema';
import { CreateEdgeDto } from './dto/edge.dto';
import { CreateCommentDto } from './dto/comment.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';

@ApiTags('graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProjectGuard)
@Controller('api/graph') 
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get(':projectId')
  @Roles(UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN)
  getGraph(@Param('projectId') projectId: string, @Request() req) {
    return this.graphService.getGraph(projectId, req.role);
  }
  
  // Nodes
  @Post(':projectId/node')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  addNode(@Param('projectId') projectId: string, @Request() req, @Body() dto: CreateNodeDto) {
      return this.graphService.addNode(projectId, req.user.userId, req.user.name || 'Unknown', dto);
  }

  @Put(':projectId/node/:nodeId')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  updateNode(@Param('projectId') projectId: string, @Param('nodeId') nodeId: string, @Request() req, @Body() dto: UpdateNodeDto) {
      return this.graphService.updateNode(projectId, nodeId, req.user.userId, req.user.name || 'Unknown', dto);
  }

  @Delete(':projectId/node/:nodeId')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  deleteNode(@Param('projectId') projectId: string, @Param('nodeId') nodeId: string, @Request() req) {
      return this.graphService.deleteNode(projectId, nodeId, req.user.name || 'Unknown');
  }

  // Edges
  @Post(':projectId/edge')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  addEdge(@Param('projectId') projectId: string, @Request() req, @Body() dto: CreateEdgeDto) {
      return this.graphService.addEdge(projectId, req.user.userId, req.user.name || 'Unknown', dto);
  }

  @Put(':projectId/edge/:edgeId')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  updateEdge(@Param('projectId') projectId: string, @Param('edgeId') edgeId: string, @Request() req, @Body() dto: any) {
      return this.graphService.updateEdge(projectId, edgeId, req.user.userId, dto);
  }

  @Delete(':projectId/edge/:edgeId')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  deleteEdge(@Param('projectId') projectId: string, @Param('edgeId') edgeId: string, @Request() req) {
      return this.graphService.deleteEdge(projectId, edgeId, req.user.name || 'Unknown');
  }

  // Comments
  @Post(':projectId/comment')
  @Roles(UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN)
  addComment(@Param('projectId') projectId: string, @Request() req, @Body() dto: CreateCommentDto) {
       return this.graphService.addComment(projectId, req.user.userId, req.user.name || 'Unknown', dto);
  }

  @Put(':projectId/comment/:commentId')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  updateComment(@Param('projectId') projectId: string, @Param('commentId') commentId: string, @Body() dto: any) {
       return this.graphService.updateComment(projectId, commentId, dto);
  }
  
  @Delete(':projectId/comment/:commentId')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  deleteComment(@Param('projectId') projectId: string, @Param('commentId') commentId: string) {
       return this.graphService.deleteComment(projectId, commentId);
  }

  @Post(':projectId/clear-room')
  @Roles(UserRole.ADMIN) // Assuming only Admin can clear
  clearGraph(@Param('projectId') projectId: string) {
      return this.graphService.clearGraph(projectId);
  }
}
