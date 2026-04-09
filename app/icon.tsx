import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRadius: 7,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: 'white',
            fontFamily: 'sans-serif',
            letterSpacing: '-1px',
            lineHeight: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          N
        </span>
      </div>
    ),
    { ...size }
  );
}
