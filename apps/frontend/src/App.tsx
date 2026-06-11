import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import DiveLog from "./pages/DiveLog";
import AddDive from "./pages/AddDive";
import EditDive from "./pages/EditDive";
import Map from "./pages/Map";
import Settings from "./pages/Settings";
import DiveSites from "./pages/DiveSites";
import Login from "./pages/Login";
import Register from "./pages/Register";
import useDiveStore from "./store/diveStore";
import useSettingsStore from "./store/settingsStore";
import useAuthStore from "./store/authStore";
import './App.css'

// RequireAuth gates the app behind authentication and loads user data
// once a session is established.
const RequireAuth = () => {
  const status = useAuthStore((state) => state.status);
  const loadDives = useDiveStore((state) => state.loadFromBackend);
  const loadSettings = useSettingsStore((state) => state.loadFromBackend);

  useEffect(() => {
    if (status === 'authenticated') {
      loadDives();
      loadSettings();
    }
  }, [status, loadDives, loadSettings]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// RedirectIfAuthenticated keeps signed-in users away from login/register
const RedirectIfAuthenticated = () => {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          {
            index: true,
            element: <DiveLog />,
          },
          {
            path: "add",
            element: <AddDive />,
          },
          {
            path: "edit/:id",
            element: <EditDive />,
          },
          {
            path: "map",
            element: <Map />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "dive-sites",
            element: <DiveSites />,
          }
        ],
      },
    ],
  },
]);

function App() {
  const initialize = useAuthStore(state => state.initialize);
  const loadDives = useDiveStore(state => state.loadFromBackend);
  const setDiveOnlineStatus = useDiveStore(state => state.setOnlineStatus);
  const setSettingsOnlineStatus = useSettingsStore(state => state.setOnlineStatus);

  useEffect(() => {
    // Clear any existing localStorage data to force backend sync
    localStorage.removeItem('dive-log-dives');
    localStorage.removeItem('dive-log-settings');

    // Try to restore the session from the refresh token cookie
    initialize();

    // Listen for online/offline events
    const handleOnline = () => {
      setDiveOnlineStatus(true);
      setSettingsOnlineStatus(true);
      if (useAuthStore.getState().status === 'authenticated') {
        loadDives(); // Reload and process offline queue
      }
    };

    const handleOffline = () => {
      setDiveOnlineStatus(false);
      setSettingsOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initialize, loadDives, setDiveOnlineStatus, setSettingsOnlineStatus]);

  return (
    <RouterProvider router={router} />
  )
}

export default App
