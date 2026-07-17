import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  consumeRedirectAfterLogin,
  setAccessToken,
} from '@/utils/authStorage';

export default function LoginSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      alert('로그인 실패: 토큰이 없습니다.');
      navigate('/', { replace: true });
      return;
    }

    setAccessToken(accessToken);

    const redirectPath = consumeRedirectAfterLogin();

    navigate(redirectPath ?? '/', { replace: true });
  }, [navigate, searchParams]);

  return (
    <section>
      <h1>로그인 처리 중...</h1>
    </section>
  );
}