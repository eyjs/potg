import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

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

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      select: [
        'id',
        'username',
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

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, updateData);
    return this.usersRepository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
