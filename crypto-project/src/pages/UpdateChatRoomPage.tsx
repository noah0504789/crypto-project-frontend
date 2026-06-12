import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { updateChatRoom } from '@/apis/chatApi';
import LoadingButton from '@/components/Button/LoadingButton';
import { CHAT_ROOM_CATEGORIES, type ChatRoomCategory } from '@/types/chatRoom';
import type { User } from '@/types/user';
import './UpdateChatRoomPage.css';

type UpdateChatRoomPageProps = {
  user: User | null;
};

type UpdateChatRoomForm = {
  title: string;
  description: string;
  category: ChatRoomCategory;
};

function isChatRoomCategory(value: string): value is ChatRoomCategory {
  return CHAT_ROOM_CATEGORIES.some((category) => category === value);
}

export default function UpdateChatRoomPage({ user }: UpdateChatRoomPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roomIdParam = searchParams.get('roomId');
  const titleParam = searchParams.get('title') ?? '';
  const descriptionParam = searchParams.get('description') ?? '';
  const categoryParam = searchParams.get('category') ?? 'CRYPTO_CURRENCY';

  const roomId = roomIdParam ? Number(roomIdParam) : NaN;

  const [form, setForm] = useState<UpdateChatRoomForm>({
    title: titleParam,
    description: descriptionParam,
    category: isChatRoomCategory(categoryParam) ? categoryParam : 'CRYPTO_CURRENCY',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoggedIn = user !== null;
  const isInvalidRoomId = Number.isNaN(roomId);

  function handleChangeTitle(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((prevForm) => ({
      ...prevForm,
      title: event.target.value,
    }));
  }

  function handleChangeDescription(
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) {
    setForm((prevForm) => ({
      ...prevForm,
      description: event.target.value,
    }));
  }

  function handleChangeCategory(event: React.ChangeEvent<HTMLSelectElement>) {
    const category = event.target.value;

    if (!isChatRoomCategory(category)) {
      return;
    }

    setForm((prevForm) => ({
      ...prevForm,
      category,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isInvalidRoomId) {
      alert('수정할 채팅방 정보가 올바르지 않습니다.');
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      alert('채팅방 제목을 입력해주세요.');
      return;
    }

    if (!description) {
      alert('채팅방 설명을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateChatRoom(roomId, {
        title,
        description,
        category: form.category,
      });

      alert('채팅방이 수정되었습니다.');
      navigate('/chat/my');
    } catch (error) {
      console.error('failed to update chat room:', error);
      alert('채팅방 수정 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="update-chat-room-page">
        <div className="update-chat-room-empty-card">
          <h1>채팅방 수정</h1>
          <p>채팅방 수정은 로그인 후 사용할 수 있습니다.</p>

          <Link to="/chat" className="update-chat-room-empty-link">
            인기 채팅방으로 이동
          </Link>
        </div>
      </section>
    );
  }

  if (isInvalidRoomId) {
    return (
      <section className="update-chat-room-page">
        <div className="update-chat-room-empty-card">
          <h1>채팅방 수정</h1>
          <p>수정할 채팅방 정보가 없습니다.</p>

          <Link to="/chat/my" className="update-chat-room-empty-link">
            내 채팅방으로 이동
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="update-chat-room-page">
      <div className="update-chat-room-card">
        <div className="update-chat-room-header">
          <h1>채팅방 수정</h1>
          <p>채팅방 제목과 설명을 수정할 수 있습니다.</p>
        </div>

        <form className="update-chat-room-form" onSubmit={handleSubmit}>
          <div className="update-chat-room-field">
            <label htmlFor="chat-room-title">채팅방 제목</label>
            <input
              id="chat-room-title"
              type="text"
              value={form.title}
              placeholder="예: 비트코인 단기 시황방"
              maxLength={50}
              onChange={handleChangeTitle}
            />
          </div>

          <div className="update-chat-room-field">
            <label htmlFor="chat-room-category">카테고리</label>
            <select
              id="chat-room-category"
              value={form.category}
              onChange={handleChangeCategory}
            >
              <option value="CRYPTO_CURRENCY">가상화폐</option>
            </select>
          </div>

          <div className="update-chat-room-field">
            <label htmlFor="chat-room-description">채팅방 설명</label>
            <textarea
              id="chat-room-description"
              value={form.description}
              placeholder="채팅방에서 어떤 이야기를 나눌지 설명해주세요."
              rows={6}
              maxLength={300}
              onChange={handleChangeDescription}
            />
          </div>

          <div className="update-chat-room-actions">
            <LoadingButton
              type="submit"
              className="update-chat-room-submit-button"
              isLoading={isSubmitting}
              loadingText="수정 중..."
            >
              채팅방 수정하기
            </LoadingButton>
          </div>
        </form>
      </div>
    </section>
  );
}