import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

import { Daily } from './pages/Dailyquiz';
import { Dailyscore } from './pages/Dailyscore';
import { Dailyhome } from './pages/Dailyhome';
import './index.css'
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

// Create a custom theme
const theme = createTheme({
  typography: {
    fontFamily: 'Poppins',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'Poppins, sans-serif',
          textTransform: 'none',
        },
      },
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      // <ProtectedRoute>
        <>
   
          <Dailyhome />
        
        </>
      // </ProtectedRoute>
    )
  },
   {
    path: '/daily',
    element: (
      // <ProtectedRoute>
        <>
     
          <Daily />
    
        </>
      // </ProtectedRoute>
    )
  },
     {
    path: '/dailyscore',
    element: (
      // <ProtectedRoute>
        <>
      
          <Dailyscore />
        
        </>
      // </ProtectedRoute>
    )
  },
       {
    path: '/dailyhome',
    element: (
      // <ProtectedRoute>
        <>
      
          <Dailyhome />
        
        </>
      // </ProtectedRoute>
    )
  }
]);

function App() {
  return (
    // Provide the custom theme to the entire app
   
    <ThemeProvider theme={theme}>
        {/* <div className="app-wrapper"> */}
      <RouterProvider router={router} />
      {/* </div> */}
    </ThemeProvider>
      
  );
}

export default App;
