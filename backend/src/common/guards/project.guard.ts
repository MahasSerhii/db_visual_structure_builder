import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Access, AccessDocument, UserRole } from '../../schema/access.schema';
import { Project, ProjectDocument } from '../../schema/project.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Access.name) private accessModel: Model<AccessDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId || request.params.id; // Support both :id and :projectId

    if (!user || !projectId) {
       // If no project context, maybe we shouldn't block? But this guard is specifically for project context.
       return true;
    }
    
    // Find Project to ensure existence
    // We try to find by _id or roomId
    let project;
    if (Types.ObjectId.isValid(projectId)) {
        project = await this.projectModel.findById(projectId);
    } else {
        project = await this.projectModel.findOne({ roomId: projectId });
    }

    if (!project) throw new NotFoundException('Project not found');

    request.project = project; // Attach project to request

    // Check Access
    const accessDoc = await this.accessModel.findOne({ projectId: project._id, isDeleted: false });
    
    if (!accessDoc) {
        // If owner, maybe access doc missing? (Shouldn't happen with correct logic)
        if (project.ownerId.toString() === user.userId) {
             request.role = UserRole.ADMIN;
             return true;
        }
        throw new ForbiddenException('Access denied');
    }

    const membership = accessDoc.access_granted.find(u => u.userId.toString() === user.userId);
    
    if (!membership || !membership.authorised) {
         throw new ForbiddenException('Access denied');
    }

    request.role = membership.role;
    
    // Check Roles logic
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No specific role required, just access
    }

    // Role Hierarchy check? Or exact match?
    // Old backend had checkAccess([List]).
    // Assuming simple inclusion.
    // Also OWNER is super admin.
    
    // Normalize roles
    // OWNER > EDITOR > VIEWER
    // If required is EDITOR, OWNER also passes.
    
    const hierarchy = {
        [UserRole.VIEWER]: 1,
        [UserRole.EDITOR]: 2,
        [UserRole.ADMIN]: 3
    };
    
    // Map string roles to hierarchy value if needed, or just array check.
    // Ideally we check if userRole is IN requiredRoles.
    // But if required is EDITOR, OWNER should pass.
    
    const userLevel = hierarchy[membership.role] || 0;
    const hasSufficientRole = requiredRoles.some(role => userLevel >= hierarchy[role]);

    return hasSufficientRole;
  }
}
