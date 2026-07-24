type HomePageProps = {
  onMockAlert: () => void;
};

export default function HomePage({ onMockAlert }: HomePageProps) {
  return (
    <section className="home-page">
      <h1>메인 페이지</h1>

      <button type="button" onClick={onMockAlert}>
        테스트 알림 발생
      </button>
    </section>
  );
}