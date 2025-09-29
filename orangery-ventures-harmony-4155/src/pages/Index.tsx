
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FairyTaleCatalog from '@/components/FairyTaleCatalog';
import About from '@/components/About';
import Footer from '@/components/Footer';
import { useFairyTales } from '@/context/FairyTaleContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { fairyTales, loading, error } = useFairyTales();

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
  
  if (loading) {
    return (
      <main className="relative pb-20">
        <Header />
        <Hero />
        <div className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загружаем сказки...</p>
        </div>
        <About />
        <Footer />
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative pb-20">
        <Header />
        <Hero />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
        <About />
        <Footer />
      </main>
    );
  }

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
