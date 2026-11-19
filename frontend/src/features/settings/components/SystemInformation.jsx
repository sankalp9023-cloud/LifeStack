import React, { useEffect, useState } from 'react';
import { getRegisteredModuleSettings } from '../data/settingsSchema';

const AVAILABLE_MODULES = [
  { name: 'Dashboard', route: '/dashboard' },
  { name: 'Study', route: '/study' },
  { name: 'Projects', route: '/projects' },
  { name: 'Tasks', route: '/projects (task engine)' },
  { name: 'Settings', route: '/settings' },
];

export default function SystemInformation({ version }) {
  const [storageEstimate, setStorageEstimate] = useState('Checking browser storage…');
  useEffect(() => {
    let active = true;
    const estimate = async () => {
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const result = await navigator.storage.estimate();
          if (active) {
            const used = Math.round((result.usage || 0) / 1024);
            const quota = result.quota ? Math.round(result.quota / 1024 / 1024) : null;
            setStorageEstimate(`${used} KB used${quota ? ` of ${quota} MB available` : ''}`);
          }
        } else if (active) {
          setStorageEstimate('Browser storage estimate is unavailable.');
        }
      } catch {
        if (active) setStorageEstimate('Browser storage estimate is unavailable.');
      }
    };
    estimate();
    return () => { active = false; };
  }, []);

  return (
    <section className="settings-options space-y-4">
      <h2 className="font-semibold">System information</h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Info label="Application" value="LifeStack" />
        <Info label="Version" value={version} />
        <Info label="Platform" value={navigator.userAgentData?.platform || navigator.platform || 'Unknown'} />
        <Info label="Browser language" value={navigator.language || 'Unknown'} />
        <Info label="Browser storage estimate" value={storageEstimate} />
        <Info label="Persistent data" value="Browser local storage" />
      </dl>
      <div>
        <h3 className="mb-2 font-medium">Available features</h3>
        <ul className="list-inside list-disc text-sm text-slate-300">
          {AVAILABLE_MODULES.map((module) => <li key={module.route}>{module.name} ({module.route})</li>)}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium">Registered module preferences</h3>
        <ul className="list-inside list-disc text-sm text-slate-300">
          {getRegisteredModuleSettings().map((module) => <li key={module.id}>{module.id}</li>)}
        </ul>
      </div>
    </section>
  );
}

function Info({ label, value }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className="text-sm">{value}</dd></div>;
}

