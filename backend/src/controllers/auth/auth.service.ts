import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schema/user.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).select('+password');
    // Invited users might have no password. 
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, id: user._id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;
    
    const existingUser = await this.userModel.findOne({ email });
    
    // Logic: user exists AND has password -> Block
    if (existingUser && existingUser.password) {
       throw new BadRequestException('User already existingUser');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let user;
    if (existingUser) {
        // Invite case: Update logic
        user = await this.userModel.findByIdAndUpdate(existingUser._id, {
             password: hashedPassword,
             name: name || existingUser.name,
             authorized: true
        }, { new: true });
    } else {
        // New User
        user = await this.userModel.create({
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            authorized: true
        });
    }

    if (!user) throw new BadRequestException("Registration failed");

    // Login logic inline or call login
    // we need to pass a POJO to login or handle it manually
    const userObj = user.toObject ? user.toObject() : user;
    return this.login(userObj);
  }
}
