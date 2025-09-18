// Material UI theme configuration (blue/white, modern, no gradients)
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4169E1', // royal blue
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0ea5e9', // light blue accent
    },
    background: {
      default: '#f8fafc', // slate-50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // slate-900
      secondary: '#475569', // slate-600
    },
    divider: '#e2e8f0',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      'Inter',
      'Segoe UI',
      'Roboto',
      'Helvetica Neue',
      'Arial',
      'Noto Sans',
      'sans-serif',
      'Apple Color Emoji',
      'Segoe UI Emoji',
    ].join(','),
    h1: { fontWeight: 700, fontSize: '1.875rem' },
    h2: { fontWeight: 700, fontSize: '1.5rem' },
    h3: { fontWeight: 600, fontSize: '1.25rem' },
    body1: { fontSize: '0.95rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
        containedPrimary: {
          color: '#ffffff',
          backgroundColor: '#4169E1',
          '&:hover': {
            backgroundColor: '#355fc1',
          },
          '&:active': {
            backgroundColor: '#2d4fb0',
          },
        },
        outlinedPrimary: {
          color: '#4169E1',
          borderColor: '#4169E1',
          '&:hover': {
            backgroundColor: 'rgba(65,105,225,0.04)',
            borderColor: '#355fc1',
          },
        },
        textPrimary: {
          color: '#4169E1',
          '&:hover': {
            backgroundColor: 'rgba(65,105,225,0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow:
            '0px 1px 2px rgba(16, 24, 40, 0.06), 0px 1px 3px rgba(16, 24, 40, 0.10)',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
        fullWidth: true,
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e2e8f0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
        },
      },
    },
  },
});

export default theme;
