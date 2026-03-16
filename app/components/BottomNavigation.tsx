"use client";

import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  label: string;
  tabId: 'scores' | 'league' | 'hr-leaders';
  icon: (isActive: boolean) => React.ReactNode;
}

interface BottomNavigationProps {
  activeTab?: 'scores' | 'league' | 'hr-leaders';
  onTabChange?: (tab: 'scores' | 'league' | 'hr-leaders') => void;
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const pathname = usePathname();

  // Fallback to pathname-based detection if props not provided (for backward compatibility)
  const tabFromPath = () => {
    if (pathname === "/scores") return "scores";
    if (pathname === "/league-tab") return "league";
    if (pathname === "/hr-leaders") return "hr-leaders";
    return "scores";
  };

  const currentTab = activeTab || tabFromPath();

  const navItems: NavItem[] = [
    {
      id: "scores",
      label: "Scores",
      tabId: "scores",
      icon: (isActive) => (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={isActive ? "2.5" : "2"}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 3v12m6-12v12M3 9h18m-2 4h2m-4 0h2m-4 0h2m-4 0h2"
          />
        </svg>
      ),
    },
    {
      id: "league",
      label: "League",
      tabId: "league",
      icon: (isActive) => (
        <svg
          className="w-6 h-6"
          fill={isActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={isActive ? "0" : "2"}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z"
          />
        </svg>
      ),
    },
    {
      id: "hr-leaders",
      label: "HR Leaders",
      tabId: "hr-leaders",
      icon: (isActive) => (
        <svg
          className="w-6 h-6"
          fill={isActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={isActive ? "0" : "2"}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "80px",
        backgroundColor: "#0f1923",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-start",
        paddingTop: "8px",
        paddingBottom: "12px",
        zIndex: 40,
        boxShadow: "0 -4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {navItems.map((item) => {
        const active = currentTab === item.tabId;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange?.(item.tabId)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: active ? "#FFFFFF" : "rgba(255,255,255,0.6)",
              transition: "all 0.2s",
              flex: 1,
            }}
            title={item.label}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                backgroundColor: active
                  ? "rgba(204,52,51,0.2)"
                  : "rgba(255,255,255,0.02)",
                transition: "all 0.2s",
                color: active ? "#CC3433" : "rgba(255,255,255,0.6)",
              }}
            >
              {item.icon(active)}
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: active ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
