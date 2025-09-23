import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'py-3 bg-white/90 backdrop-blur-md border-b border-gray-200/20 shadow-sm'
          : 'py-5 bg-transparent',
        className
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <NavLink 
          to="/" 
          className="text-xl font-serif font-medium tracking-tight transition-opacity hover:opacity-80"
        >
          Сказочная Коллекция
        </NavLink>
        
        <div className="hidden md:flex items-center space-x-8">
          <NavLink 
            to="/admin" 
            className="text-sm font-medium hover:text-orangery-500 transition-colors"
          >
            Админ
          </NavLink>
        </div>
        
        <div className="md:hidden">
          <NavLink 
            to="/admin" 
            className="text-sm font-medium hover:text-orangery-500 transition-colors"
          >
            Админ
          </NavLink>
        </div>
      </div>
    </header>
  );
};

export default Header;
