import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByUsername(username);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result as Omit<User, 'password'>;
    }
    return null;
  }

  async login(user: { username: string; id: string; role: string }) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(userDto: Partial<User>) {
    if (!userDto.username) {
      throw new BadRequestException('Username is required');
    }
    if (!userDto.password) {
      throw new BadRequestException('Password is required');
    }
    if (!userDto.battleTag) {
      throw new BadRequestException('BattleTag is required');
    }
    if (!userDto.mainRole) {
      throw new BadRequestException('Main role is required');
    }

    // Check for duplicate username
    const existingUser = await this.usersService.findByUsername(
      userDto.username,
    );
    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    // Check for duplicate battleTag
    const existingTag = await this.usersService.findByBattleTag(
      userDto.battleTag,
    );
    if (existingTag) {
      throw new BadRequestException('BattleTag already exists');
    }

    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    try {
      const user = await this.usersService.create({
        ...userDto,
        password: hashedPassword,
      });
      // Remove password from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch (error: unknown) {
      // Handle any other database constraint violations
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        // PostgreSQL unique constraint violation
        // We can't easily distinguish which field caused it without parsing error detail,
        // but we did pre-checks.
        throw new BadRequestException('Username or BattleTag already exists');
      }
      throw error;
    }
  }
}
