import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MainRole, User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    // 게스트(경매 수기 매물)는 회원 풀에서 제외
    return this.usersRepository.find({ where: { isGuest: false } });
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByIdWithClan(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['clanMembers'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['clanMembers'],
      select: [
        'id',
        'username',
        'nickname',
        'battleTag',
        'password',
        'role',
        'mainRole',
        'rating',
        'avatarUrl',
        'bettingFloatingEnabled',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async findByBattleTag(battleTag: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { battleTag },
      select: [
        'id',
        'nickname',
        'battleTag',
        'password',
        'role',
        'mainRole',
        'rating',
        'avatarUrl',
        'bettingFloatingEnabled',
        'createdAt',
        'updatedAt',
      ], // Explicitly select password for auth checks
    });
  }

  async findByDiscordId(discordId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { discordId } });
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, updateData);
    return this.usersRepository.findOne({ where: { id } });
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'password'],
    });

    if (!user) throw new BadRequestException('User not found');

    const updates: Partial<User> = {};

    if (dto.avatarUrl) {
      updates.avatarUrl = dto.avatarUrl;
    }

    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to set new password',
        );
      }
      if (!user.password) {
        // Handle case where user has no password (e.g. social login) if applicable,
        // or just allow setting if no password exists. But for now assume password exists.
        throw new BadRequestException('User has no password set');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Invalid current password');
      }
      updates.password = await bcrypt.hash(dto.password, 10);
    }

    await this.usersRepository.update(id, updates);
    const updatedUser = await this.usersRepository.findOne({ where: { id } });
    if (!updatedUser)
      throw new BadRequestException('User not found after update');
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  // === Admin (관리자 전용) ===

  async adminList(
    skip: number,
    take: number,
  ): Promise<{ rows: User[]; total: number }> {
    const [rows, total] = await this.usersRepository.findAndCount({
      where: { isGuest: false },
      select: [
        'id',
        'username',
        'nickname',
        'battleTag',
        'role',
        'mainRole',
        'avatarUrl',
        'representativeHero',
        'discordId',
        'pointsBalance',
        'marketGatePassed',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { rows, total };
  }

  async adminFindOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Member not found');
    return user;
  }

  async adminUpdateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.adminFindOrFail(id);
    user.role = role;
    return this.usersRepository.save(user);
  }

  /** 관리자: 회원 신규 생성 (username/password 필수, battleTag/nickname 선택). */
  async adminCreate(data: {
    username: string;
    password: string;
    role?: UserRole;
    nickname?: string | null;
    battleTag?: string | null;
  }): Promise<User> {
    const username = data.username.trim();
    if (!username) throw new BadRequestException('username is required');
    if (!data.password) throw new BadRequestException('password is required');

    const existing = await this.findByUsername(username);
    if (existing) throw new BadRequestException('이미 존재하는 아이디입니다');

    const battleTag = data.battleTag?.trim() || undefined;
    if (battleTag) {
      const dup = await this.findByBattleTag(battleTag);
      if (dup) throw new BadRequestException('이미 존재하는 배틀태그입니다');
    }

    const saved = await this.create({
      username,
      password: await bcrypt.hash(data.password, 10),
      role: data.role ?? UserRole.USER,
      nickname: data.nickname?.trim() || null,
      battleTag,
    });
    // 응답에서 password 해시 제거
    saved.password = undefined;
    return saved;
  }

  /**
   * 관리자: 회원 정보 통합 수정 (제공된 필드만 반영).
   * username/nickname/role/password를 한 번에 수정할 수 있다.
   * password가 빈 문자열/undefined면 비밀번호는 그대로 둔다.
   */
  async adminUpdate(
    id: string,
    data: {
      username?: string;
      nickname?: string;
      role?: UserRole;
      password?: string;
      representativeHero?: string;
      mainRole?: MainRole;
    },
  ): Promise<User> {
    const user = await this.adminFindOrFail(id);

    if (data.username !== undefined) {
      const username = data.username.trim();
      if (!username) throw new BadRequestException('아이디를 입력하세요');
      const existing = await this.findByUsername(username);
      if (existing && existing.id !== id) {
        throw new BadRequestException('이미 존재하는 아이디입니다');
      }
      user.username = username;
    }

    if (data.nickname !== undefined) {
      user.nickname = data.nickname.trim() || null;
    }

    if (data.role !== undefined) {
      user.role = data.role;
    }

    if (data.representativeHero !== undefined) {
      user.representativeHero = data.representativeHero.trim() || null;
    }

    if (data.mainRole !== undefined) {
      user.mainRole = data.mainRole;
    }

    if (data.password) {
      user.password = await bcrypt.hash(data.password, 10);
    }

    const saved = await this.usersRepository.save(user);
    saved.password = undefined;
    return saved;
  }

  /** 관리자: 로그인 아이디(username) 변경. */
  async adminUpdateUsername(id: string, usernameRaw: string): Promise<User> {
    const username = usernameRaw.trim();
    if (!username) throw new BadRequestException('username is required');
    const user = await this.adminFindOrFail(id);
    const existing = await this.findByUsername(username);
    if (existing && existing.id !== id) {
      throw new BadRequestException('이미 존재하는 아이디입니다');
    }
    user.username = username;
    return this.usersRepository.save(user);
  }

  /** 관리자: 비밀번호 재설정 (현재 비번 확인 없이 강제 변경). */
  async adminUpdatePassword(id: string, password: string): Promise<void> {
    if (!password) throw new BadRequestException('password is required');
    const user = await this.adminFindOrFail(id);
    user.password = await bcrypt.hash(password, 10);
    await this.usersRepository.save(user);
  }

  /** 관리자: 회원 삭제. */
  async adminDelete(id: string): Promise<void> {
    const user = await this.adminFindOrFail(id);
    await this.usersRepository.remove(user);
  }
}
