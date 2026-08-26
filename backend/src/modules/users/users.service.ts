import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Role } from '../roles/entities/role.entity';
import { UserStatus } from '../../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async lockUser(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID "${id}"`);
    }

    user.status = UserStatus.LOCKED;
    await this.userRepository.save(user);

    // Revoke all active sessions
    await this.refreshTokenRepository.update(
      { userId: id, isRevoked: false },
      { isRevoked: true },
    );

    return {
      message: 'Đã khóa tài khoản và thu hồi tất cả phiên đăng nhập thành công',
    };
  }

  async assignRoles(
    id: string,
    assignRolesDto: AssignRolesDto,
    organizationId: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id, organizationId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID "${id}"`);
    }

    // 1. Lấy danh sách các vai trò từ Database gắn với organizationId để bảo mật
    const roles = await this.roleRepository.find({
      where: {
        id: In(assignRolesDto.roleIds),
        organizationId,
      },
    });

    // Xác thực xem có vai trò nào không tồn tại hoặc thuộc tổ chức khác không
    if (roles.length !== assignRolesDto.roleIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều vai trò được chọn không hợp lệ hoặc không thuộc tổ chức của bạn',
      );
    }

    // 2. Gán và lưu
    user.roles = roles;
    await this.userRepository.save(user);

    return { message: 'Gán vai trò cho nhân viên thành công' };
  }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }
}
