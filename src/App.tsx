import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoDataIfEmpty } from './db/database';
import {
  ProjectSettings,
  InstrumentSetup,
  FieldBookObservation,
  ReferencePoint,
  DesignLevelRecord,
  PegSettingRecord,
  DippingObservation,
  AuditLogEntry,
} from './types/survey';
import { recalculateFieldBook } from './utils/surveyCalculations';
import { exportProjectToExcel } from './utils/excelExport';

import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FieldBookView } from './components/FieldBook/FieldBookView';
import { RLCalculatorView } from './components/RLCalculator/RLCalculatorView';
import { PegSettingView } from './components/PegSetting/PegSettingView';
import { DippingView } from './components/Dipping/DippingView';
import { ReferencePointsView } from './components/ReferencePoints/ReferencePointsView';
import { DesignLevelsView } from './components/DesignLevels/DesignLevelsView';
import { ScannerView } from './components/Scanner/ScannerView';
import { ReportsView } from './components/Reports/ReportsView';
import { SettingsView } from './components/Settings/SettingsView';
import { NewProjectModal } from './components/Modals/NewProjectModal';
import { AuditLogModal } from './components/Modals/AuditLogModal';
import { Compass, CheckCircle2, X } from 'lucide-react';

export function App() {
  const [activeProjectId, setActiveProjectId] = useState<string>('demo-project-r101');
  const [currentTab, setCurrentTab] = useState<string>('fieldbook');
  const [sunlightMode, setSunlightMode] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Modals
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [auditModalRecordId, setAuditModalRecordId] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showMobileMoreDrawer, setShowMobileMoreDrawer] = useState<boolean>(false);

  // 1. Initialise database and seed demo data on launch
  useEffect(() => {
    async function init() {
      try {
        const id = await seedDemoDataIfEmpty();
        setActiveProjectId(id);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  // 2. Reactive Dexie queries
  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const activeProject = useLiveQuery(
    () => db.projects.get(activeProjectId),
    [activeProjectId]
  );

  const rawSetups = useLiveQuery(
    () => db.setups.where({ projectId: activeProjectId }).sortBy('setupNumber'),
    [activeProjectId]
  ) || [];

  const rawObservations = useLiveQuery(
    () => db.observations.where({ projectId: activeProjectId }).toArray(),
    [activeProjectId]
  ) || [];

  const referencePoints = useLiveQuery(
    () => db.referencePoints.where({ projectId: activeProjectId }).toArray(),
    [activeProjectId]
  ) || [];

  const designLevels = useLiveQuery(
    () => db.designLevels.where({ projectId: activeProjectId }).sortBy('chainageMeters'),
    [activeProjectId]
  ) || [];

  const pegRecords = useLiveQuery(
    () => db.pegSettings.where({ projectId: activeProjectId }).toArray(),
    [activeProjectId]
  ) || [];

  const dippingRecords = useLiveQuery(
    () => db.dippingObservations.where({ projectId: activeProjectId }).toArray(),
    [activeProjectId]
  ) || [];

  const auditLogs = useLiveQuery(
    () => db.auditLogs.where({ projectId: activeProjectId }).reverse().sortBy('timestamp'),
    [activeProjectId]
  ) || [];

  // 3. Recompute Field Book observations, HIs, RLs, and Arithmetic Checks dynamically
  const { calculatedObservations, arithmeticCheck, warnings } = React.useMemo(() => {
    if (!rawSetups.length || !rawObservations.length) {
      return recalculateFieldBook(rawSetups, rawObservations);
    }
    return recalculateFieldBook(rawSetups, rawObservations);
  }, [rawSetups, rawObservations]);

  // Handlers for Observations
  const handleAddObservation = async (
    obs: Omit<FieldBookObservation, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const id = `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const newRecord: FieldBookObservation = {
      ...obs,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.observations.add(newRecord);
  };

  const handleUpdateObservation = async (
    id: string,
    updates: Partial<FieldBookObservation>,
    reason: string
  ) => {
    const existing = await db.observations.get(id);
    if (!existing) return;

    const now = new Date().toISOString();

    // Log audit trail for changed fields
    const changedKeys = Object.keys(updates) as (keyof FieldBookObservation)[];
    for (const key of changedKeys) {
      if (existing[key] !== updates[key]) {
        const audit: AuditLogEntry = {
          id: `audit-${Date.now()}-${key}`,
          projectId: existing.projectId,
          recordId: id,
          recordType: 'OBSERVATION',
          fieldChanged: String(key),
          oldValue: String(existing[key] ?? ''),
          newValue: String(updates[key] ?? ''),
          reason: reason || 'Survey observation corrected in field',
          timestamp: now,
        };
        await db.auditLogs.add(audit);
      }
    }

    await db.observations.update(id, {
      ...updates,
      updatedAt: now,
    });
  };

  const handleDeleteObservation = async (id: string) => {
    if (confirm('Delete this survey observation?')) {
      await db.observations.delete(id);
    }
  };

  // Handlers for Setups
  const handleAddSetup = async (setup: Omit<InstrumentSetup, 'id' | 'createdAt'>) => {
    const id = `setup-${Date.now()}`;
    const now = new Date().toISOString();
    await db.setups.add({
      ...setup,
      id,
      createdAt: now,
    });
  };

  // Handlers for Pegs
  const handleAddPegRecord = async (record: Omit<PegSettingRecord, 'id' | 'updatedAt'>) => {
    const id = `peg-${Date.now()}`;
    const now = new Date().toISOString();
    await db.pegSettings.add({
      ...record,
      id,
      updatedAt: now,
    });
  };

  const handleDeletePegRecord = async (id: string) => {
    await db.pegSettings.delete(id);
  };

  // Handlers for Dipping
  const handleAddDippingRecord = async (record: Omit<DippingObservation, 'id'>) => {
    const id = `dip-${Date.now()}`;
    await db.dippingObservations.add({
      ...record,
      id,
    });
  };

  const handleDeleteDippingRecord = async (id: string) => {
    await db.dippingObservations.delete(id);
  };

  // Handlers for Reference Points
  const handleAddReferencePoint = async (point: Omit<ReferencePoint, 'id'>) => {
    const id = `ref-${Date.now()}`;
    await db.referencePoints.add({
      ...point,
      id,
    });
  };

  const handleDeleteReferencePoint = async (id: string) => {
    await db.referencePoints.delete(id);
  };

  // Handlers for Design Levels
  const handleAddDesignLevel = async (record: Omit<DesignLevelRecord, 'id'>) => {
    const id = `des-${Date.now()}`;
    await db.designLevels.add({
      ...record,
      id,
    });
  };

  const handleBulkAddDesignLevels = async (records: Omit<DesignLevelRecord, 'id'>[]) => {
    const withIds = records.map((r, i) => ({
      ...r,
      id: `des-${Date.now()}-${i}`,
    }));
    await db.designLevels.bulkAdd(withIds);
  };

  const handleDeleteDesignLevel = async (id: string) => {
    await db.designLevels.delete(id);
  };

  // Handlers for Scanned Observations Import
  const handleImportReviewedObservations = async (
    obsList: Omit<FieldBookObservation, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => {
    const now = new Date().toISOString();
    const withIds: FieldBookObservation[] = obsList.map((o, idx) => ({
      ...o,
      id: `obs-ocr-${Date.now()}-${idx}`,
      createdAt: now,
      updatedAt: now,
    }));
    await db.observations.bulkAdd(withIds);
  };

  // Handlers for Project
  const handleCreateProject = async (newProj: ProjectSettings) => {
    await db.projects.add(newProj);
    // Add default Setup 1
    await db.setups.add({
      id: `setup-1-${newProj.id}`,
      projectId: newProj.id,
      setupNumber: 1,
      instrumentName: 'Dumpy Level',
      backSightPointId: 'BM-01',
      backSightReadingM: 1.25,
      heightOfInstrumentM: null,
      isClosed: false,
      notes: 'Initial setup',
      createdAt: new Date().toISOString(),
    });
    setActiveProjectId(newProj.id);
  };

  const handleUpdateProjectSettings = async (updates: Partial<ProjectSettings>) => {
    if (!activeProject) return;
    await db.projects.update(activeProject.id, updates);
  };

  const handleQuickExportExcel = () => {
    if (!activeProject) return;
    exportProjectToExcel({
      project: activeProject,
      setups: rawSetups,
      observations: calculatedObservations,
      referencePoints,
      designLevels,
      pegSettings: pegRecords,
      dippingObservations: dippingRecords,
      auditLogs,
    });
  };

  const handleRestoreBackup = async (data: any) => {
    await db.transaction(
      'rw',
      [
        db.projects,
        db.setups,
        db.observations,
        db.referencePoints,
        db.designLevels,
        db.pegSettings,
        db.dippingObservations,
        db.auditLogs,
      ],
      async () => {
        await db.projects.put(data.project);
        if (data.setups?.length) await db.setups.bulkPut(data.setups);
        if (data.observations?.length) await db.observations.bulkPut(data.observations);
        if (data.referencePoints?.length) await db.referencePoints.bulkPut(data.referencePoints);
        if (data.designLevels?.length) await db.designLevels.bulkPut(data.designLevels);
        if (data.pegSettings?.length) await db.pegSettings.bulkPut(data.pegSettings);
        if (data.dippingObservations?.length) await db.dippingObservations.bulkPut(data.dippingObservations);
        if (data.auditLogs?.length) await db.auditLogs.bulkPut(data.auditLogs);
      }
    );
    setActiveProjectId(data.project.id);
  };

  if (isInitializing || !activeProject) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-400 animate-pulse">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Initializing RoadLevel...</h2>
          <p className="text-xs text-slate-400">Loading offline IndexedDB surveying database</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pb-20 md:pb-6 transition-colors duration-200 ${
        sunlightMode ? 'bg-slate-200 text-slate-950' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeProject={activeProject}
        projects={projects}
        onSelectProject={(id) => setActiveProjectId(id)}
        onNewProject={() => setShowNewProjectModal(true)}
        sunlightMode={sunlightMode}
        setSunlightMode={setSunlightMode}
        onQuickExportExcel={handleQuickExportExcel}
      />

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto">
        {currentTab === 'fieldbook' && (
          <FieldBookView
            project={activeProject}
            setups={rawSetups}
            observations={calculatedObservations}
            arithmeticCheck={arithmeticCheck}
            warnings={warnings}
            onAddObservation={handleAddObservation}
            onUpdateObservation={handleUpdateObservation}
            onDeleteObservation={handleDeleteObservation}
            onAddSetup={handleAddSetup}
            onViewAuditLog={(recordId) => {
              setAuditModalRecordId(recordId);
              setShowAuditModal(true);
            }}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'rlcalc' && (
          <RLCalculatorView
            project={activeProject}
            setups={rawSetups}
            observations={calculatedObservations}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'pegs' && (
          <PegSettingView
            project={activeProject}
            pegRecords={pegRecords}
            onAddPegRecord={handleAddPegRecord}
            onDeletePegRecord={handleDeletePegRecord}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'dipping' && (
          <DippingView
            project={activeProject}
            dippingRecords={dippingRecords}
            onAddDippingRecord={handleAddDippingRecord}
            onDeleteDippingRecord={handleDeleteDippingRecord}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'beacons' && (
          <ReferencePointsView
            project={activeProject}
            referencePoints={referencePoints}
            onAddReferencePoint={handleAddReferencePoint}
            onDeleteReferencePoint={handleDeleteReferencePoint}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'design' && (
          <DesignLevelsView
            project={activeProject}
            designLevels={designLevels}
            observations={calculatedObservations}
            onAddDesignLevel={handleAddDesignLevel}
            onBulkAddDesignLevels={handleBulkAddDesignLevels}
            onDeleteDesignLevel={handleDeleteDesignLevel}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'scanner' && (
          <ScannerView
            project={activeProject}
            setups={rawSetups}
            onImportReviewedObservations={handleImportReviewedObservations}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            project={activeProject}
            setups={rawSetups}
            observations={calculatedObservations}
            referencePoints={referencePoints}
            designLevels={designLevels}
            pegSettings={pegRecords}
            dippingRecords={dippingRecords}
            auditLogs={auditLogs}
            arithmeticCheck={arithmeticCheck}
            onRestoreBackup={handleRestoreBackup}
            sunlightMode={sunlightMode}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            project={activeProject}
            onUpdateProjectSettings={handleUpdateProjectSettings}
            sunlightMode={sunlightMode}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar for outdoor phone ergonomics */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenMoreMenu={() => setShowMobileMoreDrawer(true)}
      />

      {/* Mobile "More" Drawer Modal */}
      {showMobileMoreDrawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-sm uppercase text-amber-400">RoadLevel Modules</span>
              <button
                onClick={() => setShowMobileMoreDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {[
                { id: 'beacons', label: 'Beacons & BMs' },
                { id: 'design', label: 'Design Levels' },
                { id: 'scanner', label: 'Scan Field Book (OCR)' },
                { id: 'reports', label: 'Reports & Export' },
                { id: 'settings', label: 'Settings' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setCurrentTab(m.id);
                    setShowMobileMoreDrawer(false);
                  }}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-left flex items-center justify-between border border-slate-700"
                >
                  <span>{m.label}</span>
                  <span className="text-amber-400">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
      />

      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        recordId={auditModalRecordId}
        auditLogs={auditLogs}
      />
    </div>
  );
}

export default App;
