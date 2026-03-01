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
 * Mobile-first responsive tab navigation component
 * Features:
 * - Scrolls horizontally on mobile (<640px)
 * - Sticky positioning at top
 * - 44px+ touch targets for accessibility
 * - Clear active tab indicator with smooth transitions
 * - Adapts layout for tablet and desktop
 */
export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: TabNavigationProps) {
  const [containerRef, setContainerRef] = React.useState<HTMLDivElement | null>(
    null
  );
  const [activeTabRef, setActiveTabRef] = React.useState<HTMLButtonElement | null>(
    null
  );

  // Scroll active tab into view on mobile
  React.useEffect(() => {
    if (containerRef && activeTabRef) {
      // Small delay to ensure layout is ready
      setTimeout(() => {
        activeTabRef.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }, 0);
    }
  }, [activeTab, containerRef, activeTabRef]);

  const baseStyles = "bg-white rounded-lg shadow";
  const borderColor = "border-b-2";
  const activeColor = "text-indigo-600 border-indigo-600";
  const inactiveColor = "text-gray-600 hover:text-gray-900";

  return (
    <div className={`${baseStyles} mb-6 sticky top-0 z-40 ${className}`}>
      {/* Scrollable container for mobile */}
      <div
        ref={setContainerRef}
        className="flex overflow-x-auto scrollbar-hide sm:overflow-x-visible"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={activeTab === tab.id ? setActiveTabRef : null}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 sm:px-6 py-4 font-medium text-sm transition-all whitespace-nowrap
              min-h-[44px] flex items-center justify-center gap-2
              ${borderColor} border-transparent
              ${activeTab === tab.id ? activeColor : inactiveColor}
              ${index !== tabs.length - 1 ? "" : ""}
            `}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CSS for hiding scrollbar on mobile while keeping functionality */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Smooth scrolling behavior */
        @media (max-width: 640px) {
          .scrollbar-hide {
            scroll-behavior: smooth;
          }
        }
      `}</style>
    </div>
  );
}
