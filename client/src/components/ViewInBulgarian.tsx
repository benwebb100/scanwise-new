import React from 'react';
import { Button } from '@/components/ui/button';
import { Globe, ExternalLink } from 'lucide-react';

interface ViewInBulgarianProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ViewInBulgarian({ className, variant = 'outline', size = 'sm' }: ViewInBulgarianProps) {
  const handleTranslate = () => {
    const url = window.location.href;
    const googleUrl = `https://translate.google.com/translate?sl=auto&tl=bg&u=${encodeURIComponent(url)}`;
    window.open(googleUrl, '_blank', 'noopener,noreferrer,nofollow');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleTranslate}
      className={className}
    >
      <Globe className="h-4 w-4 mr-2" />
      <span>View in Bulgarian</span>
      <ExternalLink className="h-3 w-3 ml-1" />
    </Button>
  );
}

export function ViewInBulgarianLink({ className }: { className?: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const googleUrl = `https://translate.google.com/translate?sl=auto&tl=bg&u=${encodeURIComponent(url)}`;
  
  return (
    <a 
      href={googleUrl} 
      target="_blank" 
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center text-sm text-blue-600 hover:text-blue-800 underline ${className || ''}`}
    >
      <Globe className="h-4 w-4 mr-1" />
      View this page in Bulgarian
      <ExternalLink className="h-3 w-3 ml-1" />
    </a>
  );
}
