import { Platform } from 'react-native';

interface QRCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export function QRCode({ value, size = 250, color = '#000000', backgroundColor = '#FFFFFF' }: QRCodeProps) {
  if (Platform.OS === 'web') {
    const QRCodeWeb = require('qrcode.react').default;
    return (
      <QRCodeWeb
        value={value}
        size={size}
        fgColor={color}
        bgColor={backgroundColor}
        level="M"
        includeMargin={true}
      />
    );
  }

  const QRCodeNative = require('react-native-qrcode-svg').default;
  return (
    <QRCodeNative
      value={value}
      size={size}
      color={color}
      backgroundColor={backgroundColor}
      ecl="M"
    />
  );
}