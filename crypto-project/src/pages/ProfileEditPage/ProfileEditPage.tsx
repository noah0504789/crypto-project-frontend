import { useState, type FormEvent } from "react";
import { updateMyProfile } from "@/apis/userApi";
import LoadingButton from "@/components/Button/LoadingButton";
import type { User } from "@/types/user";
import "./ProfileEditPage.css";

type ProfileEditPageProps = {
  user: User | null;
  onUserUpdated: (user: User) => void;
};

export default function ProfileEditPage({
  user,
  onUserUpdated,
}: ProfileEditPageProps) {
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return null;
  }

  const trimmedNickname = nickname.trim();
  const isNicknameChanged = trimmedNickname !== user.nickname;
  const canSubmit =
    trimmedNickname.length >= 2 &&
    trimmedNickname.length <= 20 &&
    isNicknameChanged;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isSubmitting || !user) {
      return;
    }

    try {
      setIsSubmitting(true);

      await updateMyProfile({
        nickname: trimmedNickname,
      });

      onUserUpdated({
        ...user,
        nickname: trimmedNickname,
      });

      alert("프로필이 수정되었습니다.");
    } catch (error) {
      console.error(error);
      alert("프로필 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="profile-edit-card">
      <div className="profile-edit-header">
        <h1>프로필 수정</h1>
        <p>닉네임을 수정할 수 있습니다.</p>
      </div>

      <form className="profile-edit-form" onSubmit={handleSubmit}>
        <label className="profile-edit-field">
          <span>닉네임</span>
          <input
            type="text"
            value={nickname}
            maxLength={20}
            onChange={(event) => setNickname(event.target.value)}
          />
        </label>

        <label className="profile-edit-field">
          <span>이메일</span>
          <input type="email" value={user.email ?? ""} disabled />
        </label>

        <div className="profile-edit-actions">
          <LoadingButton
            type="submit"
            className="profile-edit-submit-button"
            isLoading={isSubmitting}
            loadingText="저장 중..."
            disabled={!canSubmit}
          >
            수정하기
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
