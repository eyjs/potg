import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecuritySettingsCard } from './security-settings-card';

// api / toast / handleApiError 모킹.
vi.mock('@/lib/api', () => ({
  default: {
    patch: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock('@/lib/api-error', () => ({
  handleApiError: vi.fn(),
}));

import api from '@/lib/api';

describe('SecuritySettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('렌더링 — 3개 입력 + 버튼 노출', () => {
    render(<SecuritySettingsCard />);
    expect(screen.getByText('현재 비밀번호')).toBeInTheDocument();
    expect(screen.getByText('새 비밀번호')).toBeInTheDocument();
    expect(screen.getByText('새 비밀번호 확인')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /비밀번호 업데이트/ }),
    ).toBeInTheDocument();
  });

  it('빈 값으로 submit 시 zod 에러 메시지 노출 + api 호출 안함', async () => {
    render(<SecuritySettingsCard />);
    const submitBtn = screen.getByRole('button', { name: /비밀번호 업데이트/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('현재 비밀번호를 입력해주세요'),
      ).toBeInTheDocument();
    });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('유효한 값 입력 후 submit → api.patch 호출', async () => {
    const patchMock = vi.mocked(api.patch);
    patchMock.mockResolvedValueOnce({ data: {} } as never);

    const { container } = render(<SecuritySettingsCard />);
    const passwordInputs = container.querySelectorAll(
      'input[type="password"]',
    );
    expect(passwordInputs).toHaveLength(3);

    fireEvent.change(passwordInputs[0], { target: { value: 'oldpass' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'newpass1' } });
    fireEvent.change(passwordInputs[2], { target: { value: 'newpass1' } });

    fireEvent.click(screen.getByRole('button', { name: /비밀번호 업데이트/ }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/users/me', {
        password: 'newpass1',
        currentPassword: 'oldpass',
      });
    });
  });

  it('새 비밀번호 불일치 → refine 에러 노출', async () => {
    const { container } = render(<SecuritySettingsCard />);
    const passwordInputs = container.querySelectorAll(
      'input[type="password"]',
    );

    fireEvent.change(passwordInputs[0], { target: { value: 'oldpass' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'newpass1' } });
    fireEvent.change(passwordInputs[2], { target: { value: 'diffpass2' } });

    fireEvent.click(screen.getByRole('button', { name: /비밀번호 업데이트/ }));

    await waitFor(() => {
      expect(
        screen.getByText('새 비밀번호가 일치하지 않습니다'),
      ).toBeInTheDocument();
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
