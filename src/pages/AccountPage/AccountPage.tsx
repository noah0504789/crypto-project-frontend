import { Outlet } from 'react-router-dom';
import type { User } from '@/types/user';
import SideNavigation, {
  type SideNavigationItem,
} from '@/components/SideNavigation/SideNavigation';
import './AccountPage.css';

type AccountPageProps = {
  user: User | null;
};

const accountNavigationItems: SideNavigationItem[] = [
  {
    label: '프로필 수정',
    to: '/account/profile-edit',
    end: true,
  },
];

export default function AccountPage({ user }: AccountPageProps) {
  if (!user) {
    return (
      <section className="account-page">
        <div className="account-page-empty-card">
          <h1>계정</h1>
          <p>로그인 후 사용할 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="account-page">
      <div className="account-layout">
        <SideNavigation
          title="계정"
          items={accountNavigationItems}
          ariaLabel="계정 메뉴"
        />

        <div className="account-content">
          <Outlet />
        </div>
      </div>
    </section>
  );
}