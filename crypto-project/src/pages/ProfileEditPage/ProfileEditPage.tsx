import type { User } from '@/types/user';
import './ProfileEditPage.css';

type ProfileEditPageProps = {
  user: User | null;
};

export default function ProfileEditPage({ user }: ProfileEditPageProps) {
  if (!user) {
    return null;
  }

  return (
    <div className="profile-edit-card">
      <div className="profile-edit-header">
        <h1>프로필 수정</h1>
        <p>내 프로필 정보를 수정할 수 있습니다.</p>
      </div>

      <form className="profile-edit-form">
        <label className="profile-edit-field">
          <span>닉네임</span>
          <input type="text" defaultValue={user.name} />
        </label>

        <label className="profile-edit-field">
          <span>이메일</span>
          <input type="email" value={user.email ?? ''} disabled />
        </label>

        <div className="profile-edit-actions">
          <button type="submit" className="profile-edit-submit-button">
            저장하기
          </button>
        </div>
      </form>
    </div>
  );
}