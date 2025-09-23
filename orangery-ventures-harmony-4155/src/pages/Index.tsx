
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FairyTaleCatalog from '@/components/FairyTaleCatalog';
import About from '@/components/About';
import Footer from '@/components/Footer';
import { useFairyTales } from '@/context/FairyTaleContext';

const Index = () => {
  const { fairyTales } = useFairyTales();

  useEffect(() => {
    // Smooth scroll behavior for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80, // Account for header height
            behavior: 'smooth'
          });
        }
      });
    });
    
    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', function (e) {
          // Cleanup
        });
      });
    };
  }, []);
  
  return (
    <main className="relative pb-20">
      <Header />
      <Hero />
      <FairyTaleCatalog fairyTales={fairyTales} />
      <About />
      <Footer />
    </main>
  );
};

export default Index;
