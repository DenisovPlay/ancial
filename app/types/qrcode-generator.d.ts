declare module 'qrcode-generator' {
  interface QRCodeInstance {
    addData(data: string): void;
    make(): void;
    createDataURL(cellSize?: number, margin?: number): string;
    createSvgTag(opts?: { cellSize?: number; margin?: number }): string;
  }
  type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
  function qrcode(typeNumber: number, errorCorrectionLevel: QRErrorCorrectionLevel): QRCodeInstance;
  export default qrcode;
}
