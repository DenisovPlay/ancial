import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false, 
  children, 
  ...props 
}, ref) => {
  const baseStyles = 'cursor-pointer inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-white text-zinc-900 hover:bg-zinc-200', // Белая кнопка
    secondary: 'bg-zinc-800 text-white border border-zinc-600/50 hover:bg-zinc-700',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20',
    ghost: 'bg-transparent text-white hover:bg-zinc-800/50'
  };

  const sizes = {
    sm: 'text-sm px-4 py-1.5 h-9',
    md: 'text-base px-6 py-2.5 h-12',
    lg: 'text-lg px-8 py-3.5 h-14'
  };

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
