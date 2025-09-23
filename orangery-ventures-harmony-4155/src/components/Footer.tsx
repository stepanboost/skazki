
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import FadeIn from './animations/FadeIn';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className }) => {

  return (
    <footer id="contact" className={cn('py-20 md:py-32 bg-white border-t border-gray-100', className)}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="text-xl font-serif font-medium tracking-tight">
              Сказочная Коллекция
            </Link>
          </div>
          
          
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Сказочная Коллекция. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
