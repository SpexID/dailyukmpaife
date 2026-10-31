// src/theme/index.ts
import { createTheme } from '@mui/material/styles';
import { tokensSet } from './tokens';

export const createAppTheme = (palette: keyof typeof tokensSet) => {
  const tokens = tokensSet[palette];

  return createTheme({
    palette: {
      primary: {
        main: tokens.primary,
        dark: tokens.primaryDark,
        light: tokens.primaryLight,
        contrastText: tokens.primaryContrastText,
      },
      background: {
        default: tokens.pageBackground,
        paper: tokens.paper,
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary,
      },
      success: { main: tokens.success },
      error: { main: tokens.error },
      warning: { main: tokens.warning },
      info: { main: tokens.info },
    },
    shape: {
      borderRadius: tokens.borderRadius,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundColor: tokens.paper },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: tokens.borderRadius,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
          },
        },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              backgroundColor: tokens.btnPrimaryBg,
              color: tokens.btnPrimaryText,
              '&:hover': {
                backgroundColor: tokens.primaryDark,
              },
            },
          },
          {
            props: { variant: 'contained', color: 'secondary' },
            style: {
              backgroundColor: tokens.btnSecondaryBg,
              color: tokens.btnSecondaryText,
              '&:hover': {
                backgroundColor: tokens.primaryLight,
              },
            },
          },
          {
            props: { variant: 'contained', color: 'info' },
            style: {
              backgroundColor: tokens.info,
              color: '#fff',
              '&:hover': {
                backgroundColor: tokens.primaryDark,
              },
            },
          },
        ],
      },
      MuiTextField: {
        styleOverrides: {
          root: { backgroundColor: tokens.surface },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: tokens.borderRadius },
        },
      },
    },
  });
};
