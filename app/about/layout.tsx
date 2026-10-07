// Раздел «О нас»: документы и гайды читают и копируют, поэтому выделение текста здесь включено
export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <div className="select-text">{children}</div>;
}
