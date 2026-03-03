"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "light" | "dark";
  className?: string;
}

/**
 * Premium pill-style tab navigation component
 * Features:
 * - Pill-shaped tabs with glass-morphism (inactive) and red glow (active)
 * - Scrolls horizontally on mobile (<640px)
 * - 44px+ touch targets for accessibility
 * - Smooth transitions and premium shadow system
 * - Matches dashboard design system exactly
 */
export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabNavigationProps) {
  const [activeTabRef, setActiveTabRef] = React.useState<HTMLButtonElement | null>(
    null
  );

  // Scroll active tab into view on mobile
  React.useEffect(() => {
    if (activeTabRef) {
      setTimeout(() => {
        activeTabRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }, 0);
    }
  }, [activeTab, activeTabRef]);

  return (
    <div
      className={`mb-6 ${className}`}
      style={{
        display: "flex",
        gap: "8px",
        padding: "12px 16px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollBehavior: "smooth",
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={activeTab === tab.id ? setActiveTabRef : null}
          onClick={() => onTabChange(tab.id)}
          className="transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center gap-2"
          style={{
            padding: "7px 18px",
            borderRadius: "100px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background:
              activeTab === tab.id
                ? "#CC3433"
                : "rgba(255, 255, 255, 0.05)",
            color:
              activeTab === tab.id
                ? "white"
                : "rgba(255, 255, 255, 0.4)",
            boxShadow:
              activeTab === tab.id
                ? "0 4px 14px rgba(204, 52, 51, 0.45), 0 1px 0 rgba(255, 255, 255, 0.15) inset"
                : "0 2px 8px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
          }}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}

      <style jsx>{`
        div {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
