import QRCode from "qrcode";

export async function generateSessionQrDataUrl(joinUrl) {
  return QRCode.toDataURL(joinUrl, {
    margin: 1,
    width: 280,
  });
}
