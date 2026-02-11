import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Node, NodeDocument } from '../../schema/node.schema';
import { Edge, EdgeDocument } from '../../schema/edge.schema';
import { Comment, CommentDocument } from '../../schema/comment.schema';
import { History, HistoryDocument } from '../../schema/history.schema';
import { Project, ProjectDocument } from '../../schema/project.schema';
import { User, UserDocument } from '../../schema/user.schema';
import { CreateEdgeDto } from './dto/edge.dto';
import { CreateCommentDto } from './dto/comment.dto';
import { GraphGateway } from '../../gateway/graph.gateway';
import { CreateNodeDto, UpdateNodeDto } from './dto/node.dto';

@Injectable()
export class GraphService {
  constructor(
    @InjectModel(Node.name) private nodeModel: Model<NodeDocument>,
    @InjectModel(Edge.name) private edgeModel: Model<EdgeDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(History.name) private historyModel: Model<HistoryDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private graphGateway: GraphGateway,
  ) {}

  async getGraph(projectId: string, userRole: string) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const [nodes, edges, comments, history, owner] = await Promise.all([
      this.nodeModel.find({ projectId, isDeleted: false }),
      this.edgeModel.find({ projectId, isDeleted: false }),
      this.commentModel.find({ projectId, isDeleted: false }),
      this.historyModel.find({ projectId }).sort({ timestamp: -1 }).limit(50),
      this.userModel.findById(project.ownerId),
    ]);

    const cleanNodes = nodes.map(n => {
       const obj = n.toObject();
       return { ...obj, id: n.nodeId, _id: undefined }; 
    });
    const cleanEdges = edges.map(e => {
        const obj = e.toObject();
        return { ...obj, id: e.edgeId, _id: undefined };
    });
    const cleanComments = comments.map(c => {
        const obj = c.toObject();
        return { ...obj, id: c.commentId, _id: undefined };
    });

    return {
        nodes: cleanNodes,
        edges: cleanEdges,
        comments: cleanComments,
        history,
        project: {
            name: project.name,
            role: userRole,
            ownerName: owner ? owner.name : 'Unknown',
            backgroundColor: project.config?.backgroundColor
        }
    };
  }

  // --- Nodes ---

  async addNode(projectId: string, userId: string, userName: string, dto: CreateNodeDto) {
      const newNode = new this.nodeModel({
          ...dto,
          projectId,
          createdBy: userId,
          lastModifiedBy: userId
      });
      await newNode.save();
      
      const cleanNode = { ...newNode.toObject(), id: newNode.nodeId, _id: undefined };
      this.graphGateway.emitGraphChange(projectId, 'node:update', cleanNode);
      await this.recordHistory(projectId, userId, userName, 'add_node', `Added node ${dto.data.label}`);
      
      return cleanNode;
  }

  async updateNode(projectId: string, nodeId: string, userId: string, userName: string, dto: UpdateNodeDto) {
      const updated = await this.nodeModel.findOneAndUpdate(
          { projectId, nodeId },
          { ...dto, lastModifiedBy: userId },
          { new: true }
      );
      if(!updated) throw new NotFoundException('Node not found');

      const cleanNode = { ...updated.toObject(), id: updated.nodeId, _id: undefined };
      this.graphGateway.emitGraphChange(projectId, 'node:update', cleanNode);
      await this.recordHistory(projectId, userId, userName, 'update_node', `Updated node ${updated.data.label}`);

      return cleanNode;
  }

  async deleteNode(projectId: string, nodeId: string, userName: string) {
      // Soft Delete
      const deleted = await this.nodeModel.findOneAndUpdate(
          { projectId, nodeId },
          { isDeleted: true },
          { new: true }
      );
      if(!deleted) throw new NotFoundException('Node not found');
      
      this.graphGateway.emitGraphChange(projectId, 'node:delete', { nodeId });
      // Also delete connected edges
      await this.edgeModel.updateMany(
          { projectId, $or: [{ source: nodeId }, { target: nodeId }] },
          { isDeleted: true }
      );
      // We might need to fetch which edges were deleted to notify frontend? 
      // USUALLY frontend handles cascading delete visually, but for sync, we should emit edge deletions too.
      const edges = await this.edgeModel.find({ projectId, $or: [{ source: nodeId }, { target: nodeId }], isDeleted: true });
      for(const e of edges) {
          this.graphGateway.emitGraphChange(projectId, 'edge:delete', { edgeId: e.edgeId });
      }

      await this.recordHistory(projectId, null, userName, 'delete_node', `Deleted node`);
      return { success: true };
  }

  // --- Edges ---

  async addEdge(projectId: string, userId: string, userName: string, dto: CreateEdgeDto) {
      const newEdge = new this.edgeModel({
          ...dto,
          projectId,
          createdBy: userId
      });
      await newEdge.save();

      const cleanEdge = { ...newEdge.toObject(), id: newEdge.edgeId, _id: undefined };
      this.graphGateway.emitGraphChange(projectId, 'edge:update', cleanEdge);
      await this.recordHistory(projectId, userId, userName, 'add_edge', `Connected nodes`);

      return cleanEdge;
  }

  async updateEdge(projectId: string, edgeId: string, userId: string, dto: any) {
      const updated = await this.edgeModel.findOneAndUpdate(
          { projectId, edgeId },
          { ...dto },
          { new: true }
      );
      if(!updated) throw new NotFoundException('Edge not found');

      const cleanEdge = { ...updated.toObject(), id: updated.edgeId, _id: undefined };
      this.graphGateway.emitGraphChange(projectId, 'edge:update', cleanEdge);
      return cleanEdge;
  }

  async deleteEdge(projectId: string, edgeId: string, userName: string) {
      const deleted = await this.edgeModel.findOneAndUpdate(
          { projectId, edgeId },
          { isDeleted: true }
      );
      if(!deleted) throw new NotFoundException('Edge not found');

      this.graphGateway.emitGraphChange(projectId, 'edge:delete', { edgeId });
      await this.recordHistory(projectId, null, userName, 'delete_edge', 'Removed connection');
      return { success: true };
  }

  // --- Comments ---

  async addComment(projectId: string, userId: string, userName: string, dto: CreateCommentDto) {
      const newComment = new this.commentModel({
          ...dto,
          projectId,
          createdBy: userId,
          userName: userName 
      });
      await newComment.save();

      const cleanComment = { ...newComment.toObject(), id: newComment.commentId, _id: undefined };
      this.graphGateway.emitGraphChange(projectId, 'comment:update', cleanComment);
      return cleanComment;
  }

  async updateComment(projectId: string, commentId: string, dto: any) {
      const updated = await this.commentModel.findOneAndUpdate(
          { projectId, commentId },
          { ...dto },
          { new: true }
      );
      if(!updated) throw new NotFoundException('Comment not found');

      const cleanComment = { ...updated.toObject(), id: updated.commentId, _id: undefined };
      this.graphGateway.emitGraphChange(projectId, 'comment:update', cleanComment);
      return cleanComment;
  }

  async deleteComment(projectId: string, commentId: string) {
      const deleted = await this.commentModel.findOneAndUpdate(
          { projectId, commentId },
          { isDeleted: true }
      );
      if(!deleted) throw new NotFoundException('Comment not found');

      this.graphGateway.emitGraphChange(projectId, 'comment:delete', { commentId });
      return { success: true };
  }

  async clearGraph(projectId: string) {
      await this.nodeModel.updateMany({ projectId }, { isDeleted: true });
      await this.edgeModel.updateMany({ projectId }, { isDeleted: true });
      await this.commentModel.updateMany({ projectId }, { isDeleted: true });
      
      this.graphGateway.emitGraphChange(projectId, 'room:cleared', {});
      await this.recordHistory(projectId, null, 'Admin', 'clear_graph', 'Cleared entire graph');
      return { success: true };
  }

  private async recordHistory(projectId: string, userId: string | null, userName: string, action: string, details: string) {
      const entry = new this.historyModel({
          projectId,
          userId,
          userName,
          action,
          details,
          timestamp: new Date()
      });
      await entry.save();
      this.graphGateway.emitGraphChange(projectId, 'history:add', entry);
  }
}
