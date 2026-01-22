import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
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
    return this.usersRepository.find();
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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'username',
        'nickname',
        'battleTag',
        'email',
        'role',
        'mainRole',
        'rating',
        'avatarUrl',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(id, { password: hashedPassword });
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
        throw new BadRequestException('Current password is required to set new password');
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
    if (!updatedUser) throw new BadRequestException('User not found after update');
    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
