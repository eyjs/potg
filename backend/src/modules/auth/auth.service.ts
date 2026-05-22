import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
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

  async login(user: Omit<User, 'password'>) {
    const clanId = user.clanMembers?.[0]?.clanId;
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      clanId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    // Always return success message to prevent email enumeration
    if (!user) {
      return { message: '이메일이 전송되었습니다.' };
    }

    // Invalidate any existing reset tokens for this user
    await this.passwordResetRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save the reset token
    const passwordReset = this.passwordResetRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });
    await this.passwordResetRepository.save(passwordReset);

    // Send the reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        email,
        token,
        user.username,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Don't expose email sending errors to the user
    }

    return { message: '이메일이 전송되었습니다.' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const passwordReset = await this.passwordResetRepository.findOne({
      where: {
        token,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!passwordReset) {
      throw new BadRequestException(
        '유효하지 않거나 만료된 토큰입니다.',
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await this.usersService.updatePassword(passwordReset.userId, hashedPassword);

    // Mark the token as used
    passwordReset.used = true;
    await this.passwordResetRepository.save(passwordReset);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean }> {
    const passwordReset = await this.passwordResetRepository.findOne({
      where: {
        token,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    return { valid: !!passwordReset };
  }
}
