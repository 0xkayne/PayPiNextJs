declare module "qrcode" {
  export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

  export interface QRCodeOptions {
    errorCorrectionLevel?: ErrorCorrectionLevel;
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
    scale?: number;
    maskPattern?: number;
    rendererOpts?: { quality?: number; progressive?: boolean; background?: string };
  }

  export function toDataURL(text: string, options?: QRCodeOptions): Promise<string>;

  const _default: {
    toDataURL: typeof toDataURL;
  };
  export default _default;
}


