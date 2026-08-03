import axios from "axios";
import { useState, type FormEvent } from "react";
import { updateMyProfile } from "@/apis/userApi";
import LoadingButton from "@/components/Button/LoadingButton";
import type { User } from "@/types/user";
import "./ProfileEditPage.css";

type ProfileEditPageProps = {
  user: User | null;
  onUserUpdated: (user: User) => void;
};

type ValidationErrorResponse = {
  errors?: Array<{
    field?: string;
    message?: string;
  }>;
};

function getNicknameValidationMessage(error: unknown): string | null {
  if (!axios.isAxiosError<ValidationErrorResponse>(error)) {
    return null;
  }

  return (
    error.response?.data.errors?.find(
      ({ field, message }) => field === "nickname" && message,
    )?.message ?? null
  );
}

export default function ProfileEditPage({
  user,
  onUserUpdated,
}: ProfileEditPageProps) {
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
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
      setNicknameError(null);

      await updateMyProfile({
        nickname: trimmedNickname,
      });

      onUserUpdated({
        ...user,
        nickname: trimmedNickname,
      });

      alert("프로필이 수정되었습니다.");
    } catch (error) {
      const validationMessage = getNicknameValidationMessage(error);

      if (validationMessage) {
        setNicknameError(validationMessage);
      } else {
        console.error(error);
        alert("프로필 수정에 실패했습니다.");
      }
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
            aria-invalid={nicknameError !== null}
            aria-describedby={nicknameError ? "nickname-error" : undefined}
            onChange={(event) => {
              setNickname(event.target.value);
              setNicknameError(null);
            }}
          />
          {nicknameError && (
            <p
              id="nickname-error"
              className="profile-edit-field-error"
              role="alert"
            >
              {nicknameError}
            </p>
          )}
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
