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
import { SurveyBookGrid } from './components/FieldBook/SurveyBookGrid';
import { PegSettingView } from './components/PegSetting/PegSettingView';
import { DippingView } from './components/Dipping/DippingView';
import { ReportsView } from './components/Reports/ReportsView';
import { NewProjectModal } from './components/Modals/NewProjectModal';
import { FieldGuideModal } from './components/FieldBook/FieldGuideModal';

export function App() {
  const [activeProjectId, setActiveProjectId] = useState<string>('demo-project-r101');
  const [currentTab, setCurrentTab] = useState<string>('fieldbook');
  const [theme, setTheme] = useState<'light' | 'dark' | 'sunlight'>(() => {
    const saved = localStorage.getItem('roadlevel_theme');
    if (saved === 'dark' || saved === 'sunlight' || saved === 'light') return saved;
    return 'light';
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [showFieldGuideModal, setShowFieldGuideModal] = useState<boolean>(false);

  // Sync theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('roadlevel_theme', theme);
  }, [theme]);

  // Initialise database and seed demo data on first launch
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

  // Reactive Dexie queries
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

  // Recompute Field Book reductions
  const { calculatedObservations, arithmeticCheck } = React.useMemo(() => {
    return recalculateFieldBook(rawSetups, rawObservations);
  }, [rawSetups, rawObservations]);

  // Bulk save observations from interactive spreadsheet grid
  const handleSaveObservations = async (updatedRows: FieldBookObservation[]) => {
    await db.transaction('rw', db.observations, async () => {
      // Clear current project observations and write updated rows
      await db.observations.where({ projectId: activeProjectId }).delete();
      await db.observations.bulkAdd(updatedRows);
    });
  };

  // Peg handlers
  const handleAddPegRecord = async (record: Omit<PegSettingRecord, 'id' | 'updatedAt'>) => {
    const id = `peg-${Date.now()}`;
    await db.pegSettings.add({
      ...record,
      id,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeletePegRecord = async (id: string) => {
    await db.pegSettings.delete(id);
  };

  // Dipping handlers
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

  // Project creation
  const handleCreateProject = async (newProj: ProjectSettings) => {
    await db.projects.add(newProj);
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
    // Add default initial row
    await db.observations.add({
      id: `obs-init-${newProj.id}`,
      projectId: newProj.id,
      setupId: `setup-1-${newProj.id}`,
      setupNumber: 1,
      pointId: 'BM-01',
      pointType: 'BM',
      chainage: '0+000',
      chainageMeters: 0,
      position: 'CL',
      offsetMeters: 0,
      backsightM: 1.25,
      intermediateSightM: null,
      foresightM: null,
      knownRLM: 100.0,
      calculatedRL_HI: 100.0,
      riseM: null,
      fallM: null,
      calculatedRL_RF: 100.0,
      designRLM: null,
      remarks: 'Initial Benchmark',
      source: 'manual',
      isReviewed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setActiveProjectId(newProj.id);
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
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
          theme === 'dark'
            ? 'bg-slate-950 text-slate-100'
            : theme === 'sunlight'
            ? 'bg-amber-100 text-slate-950'
            : 'bg-slate-100 text-slate-800'
        }`}
      >
        <div className="text-center space-y-3">
          <span className="text-4xl block animate-bounce">📐</span>
          <h2 className="text-base font-black">Loading RoadLevel Survey Book...</h2>
          <p className="text-xs text-slate-500">Preparing offline database</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pb-20 md:pb-6 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-950 text-slate-100'
          : theme === 'sunlight'
          ? 'bg-amber-100 text-slate-950 font-medium'
          : 'bg-slate-100 text-slate-900'
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
        theme={theme}
        setTheme={setTheme}
        onQuickExportExcel={handleQuickExportExcel}
        onOpenFieldGuide={() => setShowFieldGuideModal(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Tab 1: Survey Level Book (Main Spreadsheet Grid + Photo Scanner) */}
        {currentTab === 'fieldbook' && (
          <SurveyBookGrid
            project={activeProject}
            observations={calculatedObservations}
            arithmeticCheck={arithmeticCheck}
            onSaveObservations={handleSaveObservations}
            onExportExcel={handleQuickExportExcel}
            theme={theme}
            onOpenFieldGuide={() => setShowFieldGuideModal(true)}
          />
        )}

        {/* Tab 2: Peg Setting-Out Calculator */}
        {currentTab === 'pegs' && (
          <PegSettingView
            project={activeProject}
            pegRecords={pegRecords}
            onAddPegRecord={handleAddPegRecord}
            onDeletePegRecord={handleDeletePegRecord}
            theme={theme}
          />
        )}

        {/* Tab 3: Road Dipping (Cut / Fill) */}
        {currentTab === 'dipping' && (
          <DippingView
            project={activeProject}
            dippingRecords={dippingRecords}
            onAddDippingRecord={handleAddDippingRecord}
            onDeleteDippingRecord={handleDeleteDippingRecord}
            theme={theme}
          />
        )}

        {/* Tab 4: Reports, 8-Sheet Excel Export & Backup */}
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
            theme={theme}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} theme={theme} />

      {/* Field Guide Modal */}
      <FieldGuideModal
        isOpen={showFieldGuideModal}
        onClose={() => setShowFieldGuideModal(false)}
        theme={theme}
      />

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}

export default App;
