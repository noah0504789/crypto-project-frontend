import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatRoomCategory } from '@/types/chatRoom';
import './CreateChatRoomPage.css';

type CreateChatRoomForm = {
  title: string;
  description: string;
  category: ChatRoomCategory;
};

export default function CreateChatRoomPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateChatRoomForm>({
    title: '',
    description: '',
    category: 'CRYPTO_CURRENCY',
  });

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

    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category;

    if (!title) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!description) {
      alert('내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title,
        description,
        category,
      };

      // 나중에 apiClient로 교체하면 됨
      // const response = await fetch('/chat/room', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   credentials: 'include',
      //   body: JSON.stringify(payload),
      // });
      //
      // if (response.status !== 201) {
      //   throw new Error('채팅방 생성 실패');
      // }

      console.log('create room:', payload);

      alert('✅ 방 생성 완료');
      setForm({
        title: '',
        description: '',
        category: 'CRYPTO_CURRENCY',
      });

      navigate('/chat/my');
    } catch (error) {
      console.error('submit failed:', error);
      alert('요청 처리 중 문제가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="create-chat-room-page">
      <div className="create-chat-room-card">
        <div className="create-chat-room-header">
          <h1>채팅방 생성</h1>
          <p>새로운 가상화폐 오픈채팅방을 만들어보세요.</p>
        </div>

        <form className="create-chat-room-form" onSubmit={handleSubmit}>
          <label className="create-chat-room-field">
            <span>제목</span>
            <input
              type="text"
              value={form.title}
              onChange={handleChangeTitle}
              placeholder="채팅방 제목을 입력하세요"
            />
          </label>

          <label className="create-chat-room-field">
            <span>내용</span>
            <textarea
              value={form.description}
              onChange={handleChangeDescription}
              placeholder="채팅방 설명을 입력하세요"
              rows={5}
            />
          </label>

          <label className="create-chat-room-field">
            <span>카테고리</span>
            <select value={form.category} onChange={handleChangeCategory}>
              <option value="CRYPTO_CURRENCY">CRYPTO_CURRENCY</option>
            </select>
          </label>

          <div className="create-chat-room-actions">
            <button
              type="button"
              className="create-chat-room-cancel-button"
              onClick={() => navigate('/chat')}
            >
              취소
            </button>

            <button
              type="submit"
              className="create-chat-room-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}