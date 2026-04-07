import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

function AppBootstrap() {
  const [waitingRegistration, setWaitingRegistration] = React.useState(null);
  const [isUpdateVisible, setIsUpdateVisible] = React.useState(false);
  const hasTriggeredReloadRef = React.useRef(false);

  React.useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: (registration) => {
        if (!registration?.waiting) {
          return;
        }

        setWaitingRegistration(registration);
        setIsUpdateVisible(true);
      },
    });
  }, []);

  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleControllerChange = () => {
      if (hasTriggeredReloadRef.current) {
        return;
      }

      hasTriggeredReloadRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdateNow = React.useCallback(() => {
    if (!waitingRegistration?.waiting) {
      return;
    }

    waitingRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingRegistration]);

  const handleDismissUpdate = React.useCallback(() => {
    setIsUpdateVisible(false);
  }, []);

  return (
    <>
      <App />
      {isUpdateVisible ? (
        <section className="pwa-update-banner" role="status" aria-live="polite">
          <p className="pwa-update-title">Update available</p>
          <p className="pwa-update-copy">A new version is ready. You can update now without leaving this screen.</p>
          <div className="pwa-update-actions">
            <button type="button" className="pwa-update-button pwa-update-button-secondary" onClick={handleDismissUpdate}>
              Later
            </button>
            <button type="button" className="pwa-update-button pwa-update-button-primary" onClick={handleUpdateNow}>
              Update now
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppBootstrap />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
