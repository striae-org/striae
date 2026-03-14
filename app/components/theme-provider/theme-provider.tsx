import { type JSX, createContext, useContext } from 'react';
import { classes, media } from '~/utils/style';
import { themes, tokens } from './theme';

interface ThemeContextType {
  theme: 'dark' | 'light';
}

export const ThemeContext = createContext<ThemeContextType>({ theme: 'dark' });

interface ThemeProviderProps {
  theme?: 'dark' | 'light';
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements | React.ComponentType<unknown>;
  [key: string]: unknown;
}

export const ThemeProvider = ({
  theme = 'dark',
  children,
  className,
  as: Component = 'div',
  ...rest
}: ThemeProviderProps) => {
  const parentTheme = useTheme();
  const isRootProvider = !parentTheme.theme;

  return (
    <ThemeContext.Provider
      value={{
        theme,        
      }}
    >
      {isRootProvider && children}      
      {!isRootProvider && (
       <Component className={classes(className)} data-theme={theme} {...rest}>
          {children}
        </Component>
      )}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const currentTheme = useContext(ThemeContext);
  return currentTheme;
}

export function squish(styles: string) {
  return styles.replace(/\s\s+/g, ' ');
}

export function createThemeProperties(theme: { [x: string]: unknown; black?: string; white?: string; bezierFastoutSlowin?: string; durationXS?: string; durationS?: string; durationM?: string; durationL?: string; durationXL?: string; systemFontStack?: string; fontStack?: string; monoFontStack?: string; fontWeightThin?: number; fontWeightLight?: number; fontWeightRegular?: number; fontWeightMedium?: number; fontWeightBold?: number; fontWeightBlack?: number; fontSizeH0?: string; fontSizeH1?: string; fontSizeH2?: string; fontSizeH3?: string; fontSizeH4?: string; fontSizeH5?: string; fontSizeBodyXL?: string; fontSizeBodyL?: string; fontSizeBodyM?: string; fontSizeBodyS?: string; fontSizeBodyXS?: string; lineHeightTitle?: string; lineHeightBody?: string; maxWidthS?: string; maxWidthM?: string; maxWidthL?: string; maxWidthXL?: string; spaceOuter?: string; spaceXS?: string; spaceS?: string; spaceM?: string; spaceL?: string; spaceXL?: string; space2XL?: string; space3XL?: string; space4XL?: string; space5XL?: string; zIndex0?: number; zIndex1?: number; zIndex2?: number; zIndex3?: number; zIndex4?: number; zIndex5?: number; background?: string; backgroundLight?: string; primary?: string; accent?: string; error?: string; text?: string; textTitle?: string; linkColor?: string; textBody?: string; textLight?: string; }) {
  return squish(
    Object.keys(theme)
      .map(key => `--${key}: ${theme[key]};`)
      .join('\n\n')
  );
}

export function createThemeStyleObject(theme: { [x: string]: unknown; }) {
  const style: Record<string, unknown> = {};

  for (const key of Object.keys(theme)) {
    style[`--${key}`] = theme[key];
  }

  return style;
}

export function createMediaTokenProperties() {
  return squish(
    Object.keys(media)
      .map(key => {
        return `
        @media (max-width: ${media[key]}px) {
          :root {
            ${createThemeProperties(tokens[key as keyof typeof tokens])}
          }
        }
      `;
      })
      .join('\n')
  );
}

const layerStyles = squish(`
  @layer theme, base, components, layout;
`);

const tokenStyles = squish(`
  :root {
    ${createThemeProperties(tokens.base)}
  }

  ${createMediaTokenProperties()}

  [data-theme='dark'] {
    ${createThemeProperties(themes.dark)}
  }

  [data-theme='light'] {
    ${createThemeProperties(themes.light)}
  }
`);

const fontStyles = squish(`
  @font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
`);

export const themeStyles = squish(`
  ${layerStyles}

  @layer theme {
    ${tokenStyles}
    ${fontStyles}
  }
`);
