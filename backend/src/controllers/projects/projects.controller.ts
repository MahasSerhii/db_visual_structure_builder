import { Controller, Post, Body, Delete, Param, Patch, Request, Get, Put, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { SaveProjectDto } from './dto/save-project.dto';
import { UpdateAccessDto } from './dto/access.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProjectGuard } from '../../common/guards/project.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../schema/access.schema';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('projects')
  create(@Request() req, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, createProjectDto);
  }

  @Post('save-project')
  @UseGuards(ProjectGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  saveProject(@Request() req, @Body() saveProjectDto: SaveProjectDto) {
     return this.projectsService.saveProject(req.user.userId, saveProjectDto);
  }

  @Delete('projects/:id')
  @UseGuards(ProjectGuard)
  @Roles(UserRole.ADMIN)
  delete(@Request() req, @Param('id') id: string) {
    return this.projectsService.delete(req.user.userId, id);
  }

  @Patch('projects/:id/config')
  @UseGuards(ProjectGuard)
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  updateConfig(@Request() req, @Param('id') id: string, @Body() updateConfigDto: UpdateConfigDto) {
    return this.projectsService.updateConfig(req.user.userId, id, updateConfigDto.config);
  }

  // --- Access Management ---

  @Get('projects/:projectId/access')
  @UseGuards(ProjectGuard)
  @Roles(UserRole.VIEWER, UserRole.EDITOR, UserRole.ADMIN) 
  getAccessList(@Param('projectId') projectId: string) {
      return this.projectsService.getAccessList(projectId);
  }

  @Put('projects/:projectId/access/:userId')
  @UseGuards(ProjectGuard)
  @Roles(UserRole.ADMIN)
  updateAccess(@Param('projectId') projectId: string, @Param('userId') userId: string, @Body() dto: UpdateAccessDto) {
      return this.projectsService.updateAccessRole(projectId, userId, dto.role);
  }

  @Delete('projects/:projectId/access/:userId')
  @UseGuards(ProjectGuard)
  @Roles(UserRole.ADMIN)
  removeAccess(@Param('projectId') projectId: string, @Param('userId') userId: string) {
      return this.projectsService.removeAccess(projectId, userId);
  }
}

