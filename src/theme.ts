import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: { primary: { main: '#15533f', dark: '#0d392e' }, secondary: { main: '#bd9645' }, background: { default: '#f6f7f3', paper: '#ffffff' }, text: { primary: '#1d322b', secondary: '#66736b' } },
  typography: { fontFamily: '"Segoe UI", Arial, sans-serif', button: { textTransform: 'none', fontWeight: 650 }, h1: { fontWeight: 720 }, h2: { fontWeight: 700 }, h3: { fontWeight: 700 } },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10, padding: '10px 18px' } } },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
})
