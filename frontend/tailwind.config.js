/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    // Tắt preflight để không ghi đè font, margin, padding mặc định của thẻ h1-h4, p, button, ul
    // Giúp bảo toàn 100% giao diện hiện tại của 151 file JSX chưa migrate
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          hover: 'var(--surface-hover)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          hover: 'var(--border-hover)',
          color: 'var(--border-color)',
        },
        text: {
          DEFAULT: 'var(--text)',
          dim: 'var(--text-dim)',
          muted: 'var(--text-muted)',
          main: 'var(--text-main)',
          secondary: 'var(--text-secondary)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          soft: 'var(--color-primary-soft)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          soft: 'var(--secondary-soft)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          hover: 'var(--accent-hover)',
          border: 'var(--accent-border)',
        },
        good: {
          DEFAULT: 'var(--good)',
          soft: 'var(--good-soft)',
          border: 'var(--good-border)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
          border: 'var(--warn-border)',
        },
        bad: {
          DEFAULT: 'var(--bad)',
          soft: 'var(--bad-soft)',
          border: 'var(--bad-border)',
        },
        info: {
          DEFAULT: 'var(--info)',
          soft: 'var(--info-soft)',
        },
        destructive: 'var(--color-destructive)',
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--danger-soft)',
        },
        emotion: {
          engaged: {
            DEFAULT: 'var(--emotion-engaged)',
            soft: 'var(--emotion-engaged-soft)',
            border: 'var(--emotion-engaged-border)',
          },
          confused: {
            DEFAULT: 'var(--emotion-confused)',
            soft: 'var(--emotion-confused-soft)',
            border: 'var(--emotion-confused-border)',
          },
          bored: {
            DEFAULT: 'var(--emotion-bored)',
            soft: 'var(--emotion-bored-soft)',
            border: 'var(--emotion-bored-border)',
          },
          noface: {
            DEFAULT: 'var(--emotion-noface)',
            soft: 'var(--emotion-noface-soft)',
            border: 'var(--emotion-noface-border)',
          },
          neutral: {
            DEFAULT: 'var(--emotion-neutral)',
            soft: 'var(--emotion-neutral-soft)',
            border: 'var(--emotion-neutral-border)',
          },
        },
        brand: {
          50: 'var(--brand-50)',
          200: 'var(--brand-200)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      fontSize: {
        xs: ['var(--fs-xs)', { lineHeight: '1.4' }],
        sm: ['var(--fs-sm)', { lineHeight: '1.45' }],
        base: ['var(--fs-base)', { lineHeight: '1.5' }],
        md: ['var(--fs-md)', { lineHeight: '1.5' }],
        lg: ['var(--fs-lg)', { lineHeight: '1.4' }],
        xl: ['var(--fs-xl)', { lineHeight: '1.3' }],
        '2xl': ['var(--fs-2xl)', { lineHeight: '1.25' }],
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'base': 'var(--space-base)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
