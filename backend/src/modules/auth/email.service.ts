import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    username: string,
  ): Promise<void> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from:
        this.configService.get<string>('SMTP_FROM') || '"POTG" <noreply@potg.gg>',
      to: email,
      subject: '[POTG] 비밀번호 재설정',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0B0B0B; padding: 40px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #F99E1A; padding: 12px 16px; transform: skewX(-6deg);">
              <span style="color: #0B0B0B; font-weight: 800; font-size: 24px; font-style: italic;">POTG</span>
            </div>
          </div>

          <div style="background-color: #1a1a1a; border-radius: 8px; padding: 30px; border-top: 3px solid #F99E1A;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 20px;">안녕하세요, ${username}님!</h2>

            <p style="color: #a0a0a0; line-height: 1.6; margin-bottom: 25px;">
              비밀번호 재설정을 요청하셨습니다.<br>
              아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #F99E1A; color: #0B0B0B; text-decoration: none; padding: 14px 32px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; transform: skewX(-6deg);">
                비밀번호 재설정
              </a>
            </div>

            <p style="color: #666666; font-size: 12px; line-height: 1.6;">
              이 링크는 1시간 후에 만료됩니다.<br>
              본인이 요청하지 않았다면 이 이메일을 무시해주세요.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666666; font-size: 12px;">
              POTG는 오버워치 팬 커뮤니티입니다
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
