import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1f6feb',
          secondary: '#5b67f5',
          accent: '#38bdf8',
          background: '#f5f7fb',
          surface: '#ffffff',
          error: '#d64545',
          success: '#1f9d61',
        },
      },
    },
  },
})
