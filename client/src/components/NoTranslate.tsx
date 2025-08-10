import React, { ReactNode } from 'react';

interface NoTranslateProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Component to prevent Google Translate from translating specific content
 * Useful for codes, names, technical terms, etc.
 */
export function NoTranslate({ children, className, as: Component = 'span' }: NoTranslateProps) {
  return (
    <Component translate="no" className={className}>
      {children}
    </Component>
  );
}

// Specific utility components for common use cases
export function NoTranslateCode({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code translate="no" className={className}>
      {children}
    </code>
  );
}

export function NoTranslateTooth({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span translate="no" className={className}>
      {children}
    </span>
  );
}

export function NoTranslateId({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span translate="no" className={className}>
      {children}
    </span>
  );
}
