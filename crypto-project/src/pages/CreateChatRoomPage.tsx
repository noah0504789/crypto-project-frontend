import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createChatRoom } from "@/apis/chatRoomApi";
import LoadingButton from "@/components/Button/LoadingButton";
import type { ChatRoomCategory } from "@/types/chatRoom";
import type { User } from "@/types/user";
import "./CreateChatRoomPage.css";

type CreateChatRoomPageProps = {
  user: User | null;
};

type CreateChatRoomForm = {
  title: string;
  description: string;
  category: ChatRoomCategory;
};

export default function CreateChatRoomPage({ user }: CreateChatRoomPageProps) {
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateChatRoomForm>({
    title: "",
    description: "",
    category: "CRYPTO_CURRENCY",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoggedIn = user !== null;

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
    setForm((prevForm) => ({
      ...prevForm,
      category: event.target.value as ChatRoomCategory,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const description = form.description.trim();

    if (!title) {
      alert("채팅방 제목을 입력해주세요.");
      return;
    }

    if (!description) {
      alert("채팅방 설명을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createChatRoom({
        title,
        description,
        category: form.category,
      });

      alert("채팅방이 생성되었습니다.");
      navigate("/chat/my");
    } catch (error) {
      console.error("failed to create chat room:", error);
      alert("채팅방 생성 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="create-chat-room-page">
        <div className="create-chat-room-empty-card">
          <h1>채팅방 생성</h1>
          <p>채팅방 생성은 로그인 후 사용할 수 있습니다.</p>

          <Link to="/chat" className="create-chat-room-empty-link">
            인기 채팅방으로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="create-chat-room-page">
      <div className="create-chat-room-card">
        <div className="create-chat-room-header">
          <div>
            <h1>채팅방 생성</h1>
            <p>가상화폐 이야기를 나눌 새 오픈채팅방을 만들어보세요.</p>
          </div>
        </div>

        <form className="create-chat-room-form" onSubmit={handleSubmit}>
          <div className="create-chat-room-field">
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

          <div className="create-chat-room-field">
            <label htmlFor="chat-room-category">카테고리</label>
            <select
              id="chat-room-category"
              value={form.category}
              onChange={handleChangeCategory}
            >
              <option value="CRYPTO_CURRENCY">가상화폐</option>
            </select>
          </div>

          <div className="create-chat-room-field">
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

          <div className="create-chat-room-actions">
            <LoadingButton
              type="submit"
              className="create-chat-room-submit-button"
              isLoading={isSubmitting}
              loadingText="생성 중..."
            >
              채팅방 생성하기
            </LoadingButton>
          </div>
        </form>
      </div>
    </section>
  );
}
