/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nx: {
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
          blue: 'var(--nx-blue)',
          red: 'var(--nx-red)',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont',
          '"Segoe UI Variable Display"', '"Segoe UI"', 'Helvetica',
          '"Apple Color Emoji"', 'Arial', 'sans-serif', '"Segoe UI Emoji"', '"Segoe UI Symbol"',
          '"PingFang SC"', '"Microsoft YaHei"', '"Source Han Sans SC"', '"Noto Sans CJK SC"',
        ],
        mono: [
          '"SFMono-Regular"', 'Menlo', 'Consolas', '"PT Mono"',
          '"Liberation Mono"', 'Courier', 'monospace',
        ],
      },
      maxWidth: {
        'nx-content': '720px',
      },
      boxShadow: {
        'nx-md': 'var(--c-shaOutMd)',
        'nx-lg': 'var(--c-shaOutLg)',
      },
      animation: {
        'nx-fadein': 'fadein 330ms ease-in',
        'nx-fadein-fast': 'fadein 230ms ease-in',
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
