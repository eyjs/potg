import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClanMember } from '../clans/entities/clan-member.entity';
import { PointLog } from '../clans/entities/point-log.entity';
import { SendPointDto } from './dto/send-point.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(ClanMember)
    private clanMemberRepository: Repository<ClanMember>,
    @InjectRepository(PointLog)
    private pointLogRepository: Repository<PointLog>,
    private dataSource: DataSource,
  ) {}

  async sendPoints(senderId: string, sendDto: SendPointDto) {
    if (senderId === sendDto.recipientId) {
      throw new BadRequestException('Cannot send points to yourself');
    }

    return this.dataSource.transaction(async (manager) => {
      const sender = await manager.findOne(ClanMember, {
        where: { userId: senderId, clanId: sendDto.clanId },
      });
      const recipient = await manager.findOne(ClanMember, {
        where: { userId: sendDto.recipientId, clanId: sendDto.clanId },
      });

      if (!sender) throw new BadRequestException('Sender not found in clan');
      if (!recipient)
        throw new BadRequestException('Recipient not found in clan');
      if (sender.totalPoints < sendDto.amount)
        throw new BadRequestException('Insufficient points');

      // Transfer points
      sender.totalPoints -= sendDto.amount;
      recipient.totalPoints += sendDto.amount;

      await manager.save(sender);
      await manager.save(recipient);

      // Log for sender
      const senderLog = manager.create(PointLog, {
        userId: senderId,
        clanId: sendDto.clanId,
        amount: -sendDto.amount,
        reason: `SEND_TO:${sendDto.recipientId}${sendDto.message ? ` - ${sendDto.message}` : ''}`,
      });
      await manager.save(senderLog);

      // Log for recipient
      const recipientLog = manager.create(PointLog, {
        userId: sendDto.recipientId,
        clanId: sendDto.clanId,
        amount: sendDto.amount,
        reason: `RECEIVE_FROM:${senderId}${sendDto.message ? ` - ${sendDto.message}` : ''}`,
      });
      await manager.save(recipientLog);

      return {
        success: true,
        amount: sendDto.amount,
        newBalance: sender.totalPoints,
      };
    });
  }

  async getHistory(userId: string, clanId: string) {
    return this.pointLogRepository.find({
      where: { userId, clanId },
      order: { createdAt: 'DESC' },
    });
  }
}
