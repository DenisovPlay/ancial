import Image from 'next/image';

type WalletLogoProps = {
  className?: string;
};

export default function WalletLogo({ className }: WalletLogoProps) {
  return (
    <span className={`relative inline-block aspect-[1294/189] ${className ?? ''}`}>
      <Image
        src="/img/logos/wallet.svg"
        alt="Wallet"
        fill
        priority
        unoptimized
        sizes="(max-width: 640px) 160px, 260px"
        className="object-contain"
      />
    </span>
  );
}
