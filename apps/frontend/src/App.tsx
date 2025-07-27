import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import DiveLog from "./pages/DiveLog";
import AddDive from "./pages/AddDive";
import EditDive from "./pages/EditDive";
import Map from "./pages/Map";
import Settings from "./pages/Settings";
import useDiveStore from "./store/diveStore";
import useSettingsStore from "./store/settingsStore";
import './App.css'

const router = createBrowserRouter([
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
      }
    ],
  },
]);

function App() {
  const loadDives = useDiveStore(state => state.loadFromBackend);
  const loadSettings = useSettingsStore(state => state.loadFromBackend);
  const setDiveOnlineStatus = useDiveStore(state => state.setOnlineStatus);
  const setSettingsOnlineStatus = useSettingsStore(state => state.setOnlineStatus);

  useEffect(() => {
    // Clear any existing localStorage data to force backend sync
    localStorage.removeItem('dive-log-dives');
    localStorage.removeItem('dive-log-settings');

    // Load initial data from backend
    loadDives();
    loadSettings();

    // Listen for online/offline events
    const handleOnline = () => {
      setDiveOnlineStatus(true);
      setSettingsOnlineStatus(true);
      loadDives(); // Reload and process offline queue
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
  }, [loadDives, loadSettings, setDiveOnlineStatus, setSettingsOnlineStatus]);

  return (
    <RouterProvider router={router} />
  )
}

export default App
