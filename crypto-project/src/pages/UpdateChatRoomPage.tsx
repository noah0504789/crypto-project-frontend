import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ChatRoomCategory } from '@/types/chatRoom';
import './UpdateChatRoomPage.css';

type UpdateChatRoomForm = {
  title: string;
  description: string;
  category: ChatRoomCategory;
};

export default function UpdateChatRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get('roomId');

  const initialForm: UpdateChatRoomForm = {
    title: searchParams.get('title') ?? '',
    description: searchParams.get('description') ?? '',
    category: (searchParams.get('category') as ChatRoomCategory) ?? 'CRYPTO_CURRENCY',
  };

  const [form, setForm] = useState<UpdateChatRoomForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChangeTitle(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({
      ...prev,
      title: event.target.value,
    }));
  }

  function handleChangeDescription(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((prev) => ({
      ...prev,
      description: event.target.value,
    }));
  }

  function handleChangeCategory(event: React.ChangeEvent<HTMLSelectElement>) {
    setForm((prev) => ({
      ...prev,
      category: event.target.value as ChatRoomCategory,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roomId) {
      alert('채팅방 ID가 없습니다.');
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category;

    const payload: Partial<UpdateChatRoomForm> = {};

    if (title !== initialForm.title) {
      payload.title = title;
    }

    if (description !== initialForm.description) {
      payload.description = description;
    }

    if (category !== initialForm.category) {
      payload.category = category;
    }

    if (Object.keys(payload).length === 0) {
      alert('⚠️ 변경된 내용이 없습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 나중에 apiClient로 교체하면 됨
      // await fetch(`/chat/room/${roomId}`, {
      //   method: 'PATCH',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   credentials: 'include',
      //   body: JSON.stringify(payload),
      // });

      console.log('update room:', {
        roomId,
        payload,
      });

      alert('✅ 방 수정 완료');
      navigate('/chat/my');
    } catch (error) {
      console.error('submit failed:', error);
      alert('요청 처리 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="update-chat-room-page">
      <div className="update-chat-room-card">
        <div className="update-chat-room-header">
          <h1>채팅방 수정</h1>
          <p>채팅방 제목, 내용, 카테고리를 수정할 수 있습니다.</p>
        </div>

        <form className="update-chat-room-form" onSubmit={handleSubmit}>
          <label className="update-chat-room-field">
            <span>제목</span>
            <input
              type="text"
              value={form.title}
              onChange={handleChangeTitle}
              placeholder="채팅방 제목을 입력하세요"
            />
          </label>

          <label className="update-chat-room-field">
            <span>내용</span>
            <textarea
              value={form.description}
              onChange={handleChangeDescription}
              placeholder="채팅방 설명을 입력하세요"
              rows={5}
            />
          </label>

          <label className="update-chat-room-field">
            <span>카테고리</span>
            <select value={form.category} onChange={handleChangeCategory}>
              <option value="CRYPTO_CURRENCY">CRYPTO_CURRENCY</option>
            </select>
          </label>

          <div className="update-chat-room-actions">
            <button
              type="button"
              className="update-chat-room-cancel-button"
              onClick={() => navigate('/chat/my')}
            >
              취소
            </button>

            <button
              type="submit"
              className="update-chat-room-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? '수정 중...' : '수정'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}