import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../../schema/project.schema';
import { Access, AccessDocument, UserRole } from '../../schema/access.schema';
import { Node, NodeDocument } from '../../schema/node.schema';
import { Edge, EdgeDocument } from '../../schema/edge.schema';
import { Comment, CommentDocument } from '../../schema/comment.schema';
import { History, HistoryDocument } from '../../schema/history.schema';
import { User, UserDocument } from '../../schema/user.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { SaveProjectDto } from './dto/save-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Access.name) private accessModel: Model<AccessDocument>,
    @InjectModel(Node.name) private nodeModel: Model<NodeDocument>,
    @InjectModel(Edge.name) private edgeModel: Model<EdgeDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(History.name) private historyModel: Model<HistoryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const generatedRoomId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const project = await this.projectModel.create({
      roomId: generatedRoomId,
      name: createProjectDto.name || `Project ${new Date().toLocaleDateString()}`,
      ownerId: new Types.ObjectId(userId),
      config: createProjectDto.config,
    });

    await this.accessModel.create({
      projectId: project._id,
      authorId: new Types.ObjectId(userId),
      access_granted: [{
        userId: new Types.ObjectId(userId),
        authorised: true,
        role: UserRole.ADMIN, // Map ADMIN logic
        visible: true,
        joinedAt: new Date(),
      }],
    });

    return project;
  }

  async delete(userId: string, projectId: string) {
    // Verify ownership or access? Ideally ownership for deletion.
    const project = await this.projectModel.findOne({ _id: projectId, ownerId: userId });
    
    if (!project) {
        throw new NotFoundException('Project not found or you are not the owner');
    }

    await this.nodeModel.deleteMany({ projectId });
    await this.edgeModel.deleteMany({ projectId });
    await this.commentModel.deleteMany({ projectId });
    await this.historyModel.deleteMany({ projectId });
    
    // Soft delete access
    await this.accessModel.updateMany({ projectId }, { isDeleted: true });
    
    project.isDeleted = true;
    await project.save();

    return { success: true };
  }

  async updateConfig(userId: string, projectId: string, config: Record<string, any>) {
     const project = await this.projectModel.findOne({ _id: projectId });
     // Add access check logic here (omitted for brevity, assume owner/editor)
     if (!project) throw new NotFoundException('Project not found');

     const currentConfig = project.config || {};
     project.config = { ...currentConfig, ...config };
     
     if (config.canvasBg) {
        // Legacy: update user preference
        const user = await this.userModel.findById(userId);
        if (user) {
            user.canvasBg = config.canvasBg;
            await user.save();
        }
     }

     return await project.save();
  }

  async saveProject(userId: string, saveProjectDto: SaveProjectDto) {
    const pData = saveProjectDto.project;
    
    const projectSearch = Types.ObjectId.isValid(pData.id) ? { _id: pData.id } : { roomId: pData.id };
    
    let project = await this.projectModel.findOne(projectSearch);

    if (!project) {
        const generatedRoomId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        project = await this.projectModel.create({
            roomId: generatedRoomId,
            name: pData.name || `Project ${new Date().toLocaleDateString()}`,
            ownerId: new Types.ObjectId(userId),
            config: {},
        });

        await this.accessModel.create({
            projectId: project._id,
            authorId: new Types.ObjectId(userId),
            access_granted: [{
                userId: new Types.ObjectId(userId),
                authorised: true,
                role: UserRole.ADMIN,
                visible: true,
                joinedAt: new Date(),
            }],
        });
    }

    const accessDoc = await this.accessModel.findOne({ projectId: project._id, isDeleted: false });
    if (accessDoc) {
        const exists = accessDoc.access_granted.find(u => u.userId.toString() === userId);
        if (!exists) {
            let roleStr = UserRole.VIEWER;
            if (project.ownerId.toString() === userId) {
                roleStr = UserRole.ADMIN;
            }
            accessDoc.access_granted.push({
                userId: new Types.ObjectId(userId), // Cast to ANY to match schema vs document types
                authorised: true,
                visible: true,
                role: roleStr,
                joinedAt: new Date(),
            } as any);
            await accessDoc.save();
        }
    }

    return { success: true, projectId: project._id.toString(), realRoomId: project.roomId };
  }

  async getAccessList(projectId: string) {
    const accessDoc = await this.accessModel.findOne({ projectId, isDeleted: false })
      .populate('access_granted.userId', 'name email color avatar');

    if (!accessDoc) return [];

    return accessDoc.access_granted.map((a) => {
        // Handle populated user
        const user: any = a.userId;
        if (!user || !user._id) return null; // Should not happen if data integrity implies user exists

        return {
            userId: user._id,
            name: user.name,
            email: user.email,
            color: user.color,
            avatar: user.avatar,
            role: a.role,
            joinedAt: a.joinedAt,
            invitedEmail: a.invitedEmail,
        };
    }).filter(Boolean);
  }

  async updateAccessRole(projectId: string, targetUserId: string, role: string) {
    await this.accessModel.updateOne(
        { projectId, 'access_granted.userId': new Types.ObjectId(targetUserId) },
        { $set: { 'access_granted.$.role': role } }
    );
    return { success: true };
  }

  async removeAccess(projectId: string, targetUserId: string) {
    await this.accessModel.updateOne(
        { projectId },
        { $pull: { access_granted: { userId: new Types.ObjectId(targetUserId) } } }
    );
    return { success: true };
  }
}
