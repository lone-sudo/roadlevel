import { useState } from "react";

import BackupTab from "./screens/BackupTab";
import DesignTab from "./screens/DesignTab";
import DippingTab from "./screens/DippingTab";
import FieldBookTab from "./screens/FieldBookTab";
import PegTab from "./screens/PegTab";
import PointsTab from "./screens/PointsTab";
import ProjectsScreen from "./screens/ProjectsScreen";
import SettingsTab from "./screens/SettingsTab";
import { getProject } from "./db/service";
import type { ProjectRow } from "./db/service";

const TABS = [
  ["settings", "Settings"],
  ["fieldbook", "Field book"],
  ["points", "Points, BMs & beacons"],
  ["design", "Design levels"],
  ["peg", "Peg setting-out"],
  ["dipping", "Dipping"],
  ["backup", "Backup & audit"],
] as const;
type TabId = (typeof TABS)[number][0];

export default function App() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tab, setTab] = useState<TabId>("settings");
  const [loadError, setLoadError] = useState<string | null>(null);

  const open = async (id: string) => {
    setLoadError(null);
    const p = await getProject(id);
    if (!p) { setLoadError("Project not found."); return; }
    setProject(p);
    setProjectId(p.id);
  };
  const refresh = async () => {
    if (projectId) { const p = await getProject(projectId); if (p) setProject(p); }
  };

  if (!project) {
    return <ProjectsScreen onOpen={(id) => void open(id)} />;
  }
  return (
    <div>
      <div className="topbar">
        <button className="btn" onClick={() => { setProject(null); }}>← Projects</button>
        <strong>{project.name}</strong>
        <small>{project.road_name ?? ""}</small>
        <span className="offline-note">Offline-ready · data saved locally</span>
      </div>
      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {loadError ? <div className="msg msg-error">{loadError}</div> : null}
      <div className="screen">
        {tab === "settings" ? <SettingsTab project={project} /> : null}
        {tab === "fieldbook" ? <FieldBookTab project={project} /> : null}
        {tab === "points" ? <PointsTab project={project} /> : null}
        {tab === "design" ? <DesignTab project={project} /> : null}
        {tab === "peg" ? <PegTab project={project} /> : null}
        {tab === "dipping" ? <DippingTab key={project.id} project={project} /> : null}
        {tab === "backup" ? <BackupTab project={project} /> : null}
      </div>
      {/* after settings changes the header allowance/tolerance, refresh cached copy */}
      <button hidden onClick={() => void refresh()} />
    </div>
  );
}
