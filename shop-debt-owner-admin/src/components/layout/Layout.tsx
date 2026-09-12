import React from 'react';
import { Header } from './Header';
import { BottomNav, NavTab } from './BottomNav';

interface LayoutProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAIDrawer?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, onTabChange, onOpenAIDrawer, children }) => {
  return (
    <div className="min-h-screen bg-slate-300 text-slate-900 flex flex-col antialiased">
      {/* Centered phone-width container with 90% white background */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-slate-200 border-x border-slate-300 shadow-xl relative">
        <Header onOpenAIDrawer={onOpenAIDrawer} />

        <main className="flex-1 p-4 pb-24 overflow-y-auto">
          {children}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={onTabChange} onOpenAIDrawer={onOpenAIDrawer} />
      </div>
    </div>
  );
};
