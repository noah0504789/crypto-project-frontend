import { Link } from "react-router-dom";
import "./HomePage.css";

type HomeFeature = {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
};

const HOME_FEATURES = [
  {
    to: "/chat",
    eyebrow: "코인별 오픈채팅",
    title: "실시간 채팅",
    description:
      "관심 코인 주제의 오픈채팅방에서 다른 투자자들과 실시간으로 대화하세요. 인기 채팅방부터 내가 만든 방까지.",
    cta: "채팅방 둘러보기",
  },
  {
    to: "/price-alerts",
    eyebrow: "실시간 탐지",
    title: "가격 알림",
    description:
      "코인별 변화율 임계값을 설정하면 초과하는 순간 실시간으로 알려드려요. 급변하는 시장을 놓치지 마세요.",
    cta: "알림 설정하기",
  },
] as const satisfies readonly HomeFeature[];

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="home-hero">
        <p className="home-hero-eyebrow">CRYPTO ALERT · OPEN CHAT</p>
        <h1 className="home-hero-title">
          급격한 가격 변동,
          <br />
          <span className="home-hero-accent">실시간으로 먼저 잡으세요.</span>
        </h1>
        <p className="home-hero-subtitle">
          업비트 시세를 실시간 수집해 코인별 급변을 탐지하고, 오픈채팅으로 시장의
          흐름을 함께 읽습니다.
        </p>
      </div>

      <div className="home-features">
        {HOME_FEATURES.map((feature) => (
          <Link key={feature.to} to={feature.to} className="home-feature-card">
            <span className="home-feature-eyebrow">{feature.eyebrow}</span>
            <h2 className="home-feature-title">{feature.title}</h2>
            <p className="home-feature-description">{feature.description}</p>
            <span className="home-feature-cta">
              {feature.cta}
              <em className="home-feature-arrow">→</em>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
