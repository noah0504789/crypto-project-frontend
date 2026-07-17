import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './SideNavigation.css';

export type SideNavigationItem = {
  label: string;
  to?: string;
  end?: boolean;
  children?: SideNavigationItem[];
};

type SideNavigationProps = {
  title: string;
  items: SideNavigationItem[];
  ariaLabel?: string;
};

export default function SideNavigation({
  title,
  items,
  ariaLabel = '사이드 메뉴',
}: SideNavigationProps) {
  const [openLabels, setOpenLabels] = useState<string[]>(() =>
    items
      .filter((item) => item.children && item.children.length > 0)
      .map((item) => item.label),
  );

  function handleToggle(label: string) {
    setOpenLabels((prevLabels) => {
      if (prevLabels.includes(label)) {
        return prevLabels.filter((prevLabel) => prevLabel !== label);
      }

      return [...prevLabels, label];
    });
  }

  function renderNavigationItem(item: SideNavigationItem, depth = 0) {
    const hasChildren = item.children !== undefined && item.children.length > 0;
    const isOpen = openLabels.includes(item.label);

    if (hasChildren) {
      return (
        <div key={item.label} className="side-navigation-group">
          <button
            type="button"
            className={`side-navigation-item side-navigation-toggle depth-${depth} ${
              isOpen ? 'open' : ''
            }`}
            onClick={() => handleToggle(item.label)}
          >
            <span>{item.label}</span>
            <em className="side-navigation-arrow">›</em>
          </button>

          {isOpen && (
            <div className="side-navigation-children">
              {item.children?.map((child) =>
                renderNavigationItem(child, depth + 1),
              )}
            </div>
          )}
        </div>
      );
    }

    if (!item.to) {
      return (
        <div
          key={item.label}
          className={`side-navigation-item side-navigation-text depth-${depth}`}
        >
          <span>{item.label}</span>
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          `side-navigation-item side-navigation-link depth-${depth} ${
            isActive ? 'active' : ''
          }`
        }
      >
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <aside className="side-navigation">
      <div className="side-navigation-header">
        <h2>{title}</h2>
      </div>

      <nav className="side-navigation-menu" aria-label={ariaLabel}>
        {items.map((item) => renderNavigationItem(item))}
      </nav>
    </aside>
  );
}