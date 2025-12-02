
import React from 'react';
import { Sparkles } from 'lucide-react';

interface SelectionButtonProps {
  onClick: () => void;
  visible: boolean;
  position: { top: number; left: number } | null;
  isLoading?: boolean;
}

export const SelectionButton: React.FC<SelectionButtonProps> = ({ onClick, visible, position, isLoading }) => {
  if (!visible || !position) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{ top: position.top, left: position.left }}
      className={`
        absolute z-50 flex items-center justify-center 
        w-8 h-8 rounded-full shadow-lg 
        transition-all duration-200 ease-in-out animate-in fade-in zoom-in
        ${isLoading 
          ? 'bg-gray-400 cursor-wait' 
          : 'bg-teal-500 hover:bg-teal-600 hover:scale-110 cursor-pointer text-white'
        }
      `}
      title="اصلاح متن انتخاب شده"
    >
      <Sparkles size={16} className={isLoading ? 'animate-spin' : ''} />
    </button>
  );
};