/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          text: {
            primary: 'var(--c-texPri)',
            secondary: 'var(--c-texSec)',
            tertiary: 'var(--c-texTer)',
            disabled: 'var(--c-texDis)',
          },
          bg: {
            primary: 'var(--c-bacPri)',
            secondary: 'var(--c-bacSec)',
            tertiary: 'var(--c-bacTer)',
            elevated: 'var(--c-bacEle)',
          },
          border: {
            primary: 'var(--c-borPri)',
            secondary: 'var(--c-borSec)',
          },
          icon: {
            primary: 'var(--c-icoPri)',
            secondary: 'var(--c-icoSec)',
            disabled: 'var(--c-icoDis)',
          },
          blue: 'var(--notion-blue)',
          red: 'var(--notion-red)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica',
          '"Apple Color Emoji"', 'Arial', 'sans-serif',
          '"PingFang SC"', '"Microsoft YaHei"', '"Source Han Sans SC"', '"Noto Sans CJK SC"',
        ],
        mono: [
          '"SFMono-Regular"', 'Menlo', 'Consolas', '"PT Mono"',
          '"Liberation Mono"', 'Courier', 'monospace',
        ],
      },
      maxWidth: {
        'notion-content': '720px',
      },
      boxShadow: {
        'notion-md': 'var(--c-shaOutMd)',
        'notion-lg': 'var(--c-shaOutLg)',
      },
      animation: {
        'notion-fadein': 'fadein 330ms ease-in',
        'notion-fadein-fast': 'fadein 230ms ease-in',
      },
      keyframes: {
        fadein: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
