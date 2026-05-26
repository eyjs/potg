import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { User, UserRole } from '../../users/entities/user.entity';

/**
 * Discord interaction 호출자가 ADMIN role 인지 검증.
 *
 * 사용:
 *   const user = await assertAdmin(usersService, interaction.user.id);
 *
 * @throws ForbiddenException — 가입 안된 유저 / role !== ADMIN
 */
export async function assertAdmin(
  users: UsersService,
  discordId: string,
): Promise<User> {
  const user = await users.findByDiscordId(discordId);
  if (!user) {
    throw new ForbiddenException(
      '봇에 가입되지 않은 사용자입니다. 먼저 /잔액 명령으로 가입해주세요.',
    );
  }
  if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('관리자만 사용할 수 있는 명령입니다.');
  }
  return user;
}
