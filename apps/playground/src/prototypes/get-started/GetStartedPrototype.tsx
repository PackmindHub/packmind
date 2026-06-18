import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMNativeSelect,
  PMPage,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  SAMPLE_SKILL,
  STARTER_PACKAGE_NAME,
  STUB_ACTIVITY,
  STUB_GOVERNANCE_ROWS,
  STUB_IMPORTED_SKILLS,
  STUB_PROPOSED_SKILLS,
  STEPS,
} from './data';
import type {
  ImportedSkill,
  ProposedSkill,
  Scenario,
  ShipOutcome,
  ShipState,
  StepId,
  StepStatus,
} from './types';
import { StepSpine } from './components/StepSpine';
import { CompletionState } from './components/CompletionState';
import { ImportSkillsStep } from './components/steps/ImportSkillsStep';
import { BundlePackageStep } from './components/steps/BundlePackageStep';
import { ShipToRepoStep } from './components/steps/ShipToRepoStep';
import { GovernanceStep } from './components/steps/GovernanceStep';

const STEP_ORDER: StepId[] = ['import', 'bundle', 'ship', 'govern'];

interface ScenarioState {
  skills: ImportedSkill[];
  proposed: ProposedSkill[];
  packageCreated: boolean;
  selectedSkillIds: string[];
  shipState: ShipState;
  selectedStep: StepId;
}

function presetFor(scenario: Scenario): ScenarioState {
  switch (scenario) {
    case 'fresh':
      return {
        skills: [],
        proposed: [],
        packageCreated: false,
        selectedSkillIds: [],
        shipState: 'idle',
        selectedStep: 'import',
      };
    case 'midFlow':
      return {
        skills: STUB_IMPORTED_SKILLS,
        proposed: [],
        packageCreated: true,
        selectedSkillIds: STUB_IMPORTED_SKILLS.map((s) => s.id),
        shipState: 'idle',
        selectedStep: 'ship',
      };
    case 'activated':
      return {
        skills: STUB_IMPORTED_SKILLS,
        proposed: [],
        packageCreated: true,
        selectedSkillIds: STUB_IMPORTED_SKILLS.map((s) => s.id),
        shipState: 'success',
        selectedStep: 'govern',
      };
  }
}

export default function GetStartedPrototype() {
  const [scenario, setScenario] = useState<Scenario>('fresh');
  const [governanceFlag, setGovernanceFlag] = useState(true);

  const initial = useMemo(() => presetFor('fresh'), []);
  const [skills, setSkills] = useState<ImportedSkill[]>(initial.skills);
  const [proposed, setProposed] = useState<ProposedSkill[]>(initial.proposed);
  const [importing, setImporting] = useState(false);
  const [packageCreated, setPackageCreated] = useState(initial.packageCreated);
  const [packageName, setPackageName] = useState(STARTER_PACKAGE_NAME);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    initial.selectedSkillIds,
  );
  const [shipState, setShipState] = useState<ShipState>(initial.shipState);
  const [shipOutcome, setShipOutcome] = useState<ShipOutcome>('success');
  const [selectedStep, setSelectedStep] = useState<StepId>(
    initial.selectedStep,
  );

  const timers = useRef<number[]>([]);
  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  const applyScenario = useCallback((next: Scenario) => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const preset = presetFor(next);
    setScenario(next);
    setSkills(preset.skills);
    setProposed(preset.proposed);
    setImporting(false);
    setPackageCreated(preset.packageCreated);
    setPackageName(STARTER_PACKAGE_NAME);
    setSelectedSkillIds(preset.selectedSkillIds);
    setShipState(preset.shipState);
    setShipOutcome('success');
    setSelectedStep(preset.selectedStep);
  }, []);

  // ── Step status derivation ────────────────────────────────────────────────
  const doneById = useMemo<Record<StepId, boolean>>(
    () => ({
      import: skills.length > 0,
      bundle: packageCreated,
      ship: shipState === 'success',
      govern: shipState === 'success',
    }),
    [skills.length, packageCreated, shipState],
  );

  const activeStep = useMemo<StepId>(
    () => STEP_ORDER.find((id) => !doneById[id]) ?? 'govern',
    [doneById],
  );

  const statusById = useMemo<Record<StepId, StepStatus>>(() => {
    const map = {} as Record<StepId, StepStatus>;
    for (const id of STEP_ORDER) {
      map[id] = doneById[id]
        ? 'done'
        : id === activeStep
          ? 'active'
          : 'pending';
    }
    return map;
  }, [doneById, activeStep]);

  const allDone = STEP_ORDER.every((id) => doneById[id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAddSample = useCallback(() => {
    setSkills((prev) =>
      prev.some((s) => s.id === SAMPLE_SKILL.id)
        ? prev
        : [...prev, SAMPLE_SKILL],
    );
    setSelectedSkillIds((prev) =>
      prev.includes(SAMPLE_SKILL.id) ? prev : [...prev, SAMPLE_SKILL.id],
    );
  }, []);

  const handleSimulateCli = useCallback(() => {
    setImporting(true);
    schedule(() => {
      setProposed(STUB_PROPOSED_SKILLS);
      setImporting(false);
    }, 1200);
  }, [schedule]);

  const handleApprove = useCallback((id: string) => {
    setProposed((prev) => {
      const match = prev.find((p) => p.id === id);
      if (match) {
        const imported: ImportedSkill = { ...match, source: 'cli' };
        setSkills((skillsPrev) => [...skillsPrev, imported]);
        setSelectedSkillIds((sel) => [...sel, imported.id]);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleToggleSkill = useCallback((id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleCreatePackage = useCallback(() => {
    setPackageCreated(true);
    setSelectedStep('ship');
  }, []);

  const ship = useCallback(() => {
    setShipState('pending');
    schedule(() => {
      setShipState(shipOutcome);
      if (shipOutcome === 'success') {
        setSelectedStep('govern');
      }
    }, 1400);
  }, [schedule, shipOutcome]);

  const handleRetry = useCallback(() => setShipState('idle'), []);

  // ── Render the active working surface ──────────────────────────────────────
  const renderSurface = () => {
    switch (selectedStep) {
      case 'import':
        return (
          <ImportSkillsStep
            skills={skills}
            proposed={proposed}
            importing={importing}
            sampleAdded={skills.some((s) => s.id === SAMPLE_SKILL.id)}
            onAddSample={handleAddSample}
            onSimulateCli={handleSimulateCli}
            onApprove={handleApprove}
          />
        );
      case 'bundle':
        return (
          <BundlePackageStep
            skills={skills}
            packageCreated={packageCreated}
            packageName={packageName}
            selectedSkillIds={selectedSkillIds}
            onToggleSkill={handleToggleSkill}
            onNameChange={setPackageName}
            onCreate={handleCreatePackage}
          />
        );
      case 'ship':
        return (
          <ShipToRepoStep
            packageName={packageName}
            shipState={shipState}
            shipOutcome={shipOutcome}
            onOutcomeChange={setShipOutcome}
            onShipCli={ship}
            onShipWeb={ship}
            onRetry={handleRetry}
          />
        );
      case 'govern':
        return (
          <GovernanceStep
            shipped={shipState === 'success'}
            governanceFlag={governanceFlag}
            rows={STUB_GOVERNANCE_ROWS}
            activity={STUB_ACTIVITY}
          />
        );
    }
  };

  return (
    <PMPage
      title="Get started"
      subtitle="Ship your playbook to a repo, then watch it land in governance."
      isFullWidth
      actions={
        <PrototypeControls
          scenario={scenario}
          onScenarioChange={applyScenario}
          governanceFlag={governanceFlag}
          onGovernanceFlagChange={setGovernanceFlag}
        />
      }
    >
      <PMVStack gap={5} align="stretch">
        {allDone && <CompletionState skillCount={skills.length} />}

        <PMBox
          bg="background.secondary"
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          overflow="hidden"
          minHeight="560px"
          height="calc(100vh - 240px)"
        >
          <PMHStack gap={0} align="stretch" height="100%">
            <PMBox
              width="340px"
              flexShrink={0}
              borderRightWidth="1px"
              borderColor="border.tertiary"
              padding={4}
              overflowY="auto"
            >
              <StepSpine
                steps={STEPS}
                statusById={statusById}
                selectedId={selectedStep}
                onSelect={setSelectedStep}
              />
            </PMBox>
            <PMBox
              flex={1}
              minW={0}
              bg="background.primary"
              padding={8}
              overflowY="auto"
            >
              {renderSurface()}
            </PMBox>
          </PMHStack>
        </PMBox>
      </PMVStack>
    </PMPage>
  );
}

function PrototypeControls({
  scenario,
  onScenarioChange,
  governanceFlag,
  onGovernanceFlagChange,
}: Readonly<{
  scenario: Scenario;
  onScenarioChange: (s: Scenario) => void;
  governanceFlag: boolean;
  onGovernanceFlagChange: (v: boolean) => void;
}>) {
  return (
    <PMHStack gap={4} align="center">
      <PMHStack gap={2} align="center">
        <PMText fontSize="xs" color="faded">
          Scenario
        </PMText>
        <PMNativeSelect
          items={[
            { label: 'Fresh start', value: 'fresh' },
            { label: 'Mid-flow (ready to ship)', value: 'midFlow' },
            { label: 'Activated', value: 'activated' },
          ]}
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as Scenario)}
          size="sm"
          width="220px"
        />
      </PMHStack>
      <PMHStack gap={2} align="center">
        <PMText fontSize="xs" color="faded">
          Governance flag
        </PMText>
        <PMNativeSelect
          items={[
            { label: 'On', value: 'on' },
            { label: 'Off (fallback)', value: 'off' },
          ]}
          value={governanceFlag ? 'on' : 'off'}
          onChange={(e) => onGovernanceFlagChange(e.target.value === 'on')}
          size="sm"
          width="150px"
        />
      </PMHStack>
    </PMHStack>
  );
}
