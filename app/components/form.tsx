import React, { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

// --- INPUT ---
export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return (
    <input
      ref={ref}
      className={`w-full bg-zinc-800/30 border border-zinc-600/30 rounded-3xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500/80 focus:bg-zinc-800/80 transition-all ${props.className || ''}`}
      {...props}
    />
  );
});
Input.displayName = 'Input';

// --- TEXTAREA ---
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => {
  return (
    <textarea
      ref={ref}
      className={`w-full bg-zinc-800/30 border border-zinc-600/30 rounded-3xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500/80 focus:bg-zinc-800/80 transition-all resize-none ${props.className || ''}`}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

// --- SEARCHBAR ---
export const SearchBar = (props: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div className={`relative w-full ${props.className || ''}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
        <svg className="w-5 h-5 fill-zinc-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <use href="/icons.svg#IC-search"></use>
        </svg>
      </div>
      <input
        type="text"
        className="w-full bg-zinc-900/50 border border-zinc-600/30 rounded-full pl-12 pr-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:bg-zinc-800/80 transition-all"
        {...props}
      />
    </div>
  );
};

// --- SWITCH ---
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Switch = ({ checked, onChange, label }: SwitchProps) => {
  return (
    <label className="flex items-center cursor-pointer gap-3 relative select-none">
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className={`block w-12 h-7 rounded-full transition-colors duration-300 ${checked ? 'bg-zinc-200' : 'bg-zinc-700'}`}></div>
        <div className={`absolute left-1 top-1 bg-zinc-900 w-5 h-5 rounded-full transition-transform duration-300 ${checked ? 'transform translate-x-5' : ''}`}></div>
      </div>
      {label && <span className="text-white text-sm font-medium">{label}</span>}
    </label>
  );
};

// --- RADIO ---
interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = ({ checked, onChange, label, name, value, className = '', ...props }: RadioProps) => {
  return (
    <label className={`flex items-center cursor-pointer gap-3 select-none ${className}`}>
      <input 
        type="radio" 
        className="sr-only peer" 
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <div className="w-6 h-6 rounded-full border-2 border-zinc-500 flex items-center justify-center peer-checked:border-white transition-colors">
        <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${checked ? 'scale-100' : 'scale-0'}`}></div>
      </div>
      {label && <span className="text-white text-sm">{label}</span>}
    </label>
  );
};

// --- SELECT ---
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={`w-full bg-zinc-800/30 border border-zinc-600/30 rounded-3xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-zinc-500/80 focus:bg-zinc-800/80 transition-all appearance-none cursor-pointer ${props.className || ''}`}
        {...props}
      >
        {props.children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
        <svg className="w-5 h-5 fill-zinc-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </div>
    </div>
  );
});
Select.displayName = 'Select';
