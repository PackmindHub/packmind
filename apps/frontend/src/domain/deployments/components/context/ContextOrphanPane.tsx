import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PMAlertDialog, PMBox, pmToaster } from '@packmind/ui';
import type {
  OrganizationId,
  PackageResponse,
  Rule,
  SkillFile,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS_SINGULAR,
  type ContextComponent,
} from './buildPackageContext';
import {
  componentEditHref,
  componentEntryHref,
  componentRuleHref,
  inventoryHref,
  isDefaultTab,
  selectRuleTab,
  selectTab,
  TAB_PARAM,
} from './buildComponentDetail';
import { ContextComponentDetail } from './ContextComponentDetail';
import { ContextSkillFileDetail } from './ContextSkillFileDetail';
import { ContextRuleDetail } from './ContextRuleDetail';
import { MoveComponentDrawer } from './MoveComponentDrawer';
import { useDeleteContextComponent } from './useDeleteContextComponent';

/**
 * One component of the space, read with no package around it.
 *
 * The case exists because a component does not need a package: a standard
 * arrives from a repository before anyone sorts it, a command is created in the
 * space and placed later, and every component outlives the packages that
 * referenced it. The inventory is the list they appear in, and clicking a row
 * of it was the last gesture on this surface that led out of it.
 *
 * A pane of its own rather than the package pane with a null package. That pane
 * is a package: its header, its two tabs, its distribution and every control on
 * it are about the container, and the branch where a component is open is the
 * one part of it that does not need one. Threading a null through the rest
 * would make every one of those read as "when there is a package", which is a
 * question they should never have to ask.
 *
 * Three things differ from being read inside one, and all three are the absence
 * of the package rather than a different design: the way back is the inventory,
 * the move is an add because there is nothing to leave, and there is nothing to
 * be removed from.
 */
export function ContextOrphanPane({
  component,
  file,
  rule,
  packages,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
  onCreatePackage,
}: Readonly<{
  component: ContextComponent;
  /**
   * The file of it the address asks for, when it is a skill and the address
   * asks for one. Resolved by the surface, which owns the query the rail's tree
   * is built from: two resolutions of the same parameter would be two chances
   * to disagree about which row of that tree is open.
   */
  file: SkillFile | null;
  /**
   * The rule of it the address asks for, when it is a standard and the address
   * asks for one. Resolved by the surface for the same reason the file is.
   */
  rule: Rule | null;
  /** The space's packages, as candidates for the add. */
  packages: readonly PackageResponse[];
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
  /**
   * Opens the drawer that names a new package, for the add drawer that has
   * nowhere to add anything. Held by the surface, for the reason both other
   * panes give: it decides what happens to the package once it exists.
   */
  onCreatePackage: () => void;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { deleteComponent, isDeleting } = useDeleteContextComponent({
    spaceId,
    organizationId,
  });

  /*
   * Always the component's own tabs, unlike the package pane's, which reads the
   * same parameter two ways depending on what is open. Here there is only ever
   * one thing open.
   */
  const tab = selectTab(searchParams.get(TAB_PARAM), true);

  const showTab = (value: string) => {
    setSearchParams(
      (previous) => {
        if (isDefaultTab(value)) previous.delete(TAB_PARAM);
        else previous.set(TAB_PARAM, value);
        return previous;
      },
      { replace: true },
    );
  };

  /*
   * Deleting what is on screen, so the address stops naming it. To the
   * inventory rather than to a package, which is where this component was read
   * from and the only list it was in.
   */
  const deleteThisComponent = async () => {
    try {
      await deleteComponent(component);
      pmToaster.create({
        type: 'success',
        title: `Deleted ${component.name}`,
        description: 'It is gone from the space.',
      });
      setConfirmingDelete(false);
      setSearchParams(inventoryHref(searchParams).slice(1));
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't delete ${component.name}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  const label = COMPONENT_TYPE_LABELS_SINGULAR[component.type].toLowerCase();

  /*
   * A file in place of the component, not beside it, exactly as inside a
   * package: the tree in the rail is what says which of the two is on screen,
   * and the component is its first row.
   */
  if (file) {
    return (
      <PMBox flex="1" minH={0} overflowY="auto">
        <ContextSkillFileDetail
          file={file}
          skillId={component.key as SkillId}
          skillName={component.name}
          backHref={componentEntryHref(searchParams)}
        />
      </PMBox>
    );
  }

  /* And a rule in place of the standard, for the same reason. */
  if (rule) {
    return (
      <PMBox flex="1" minH={0} overflowY="auto">
        <ContextRuleDetail
          standardId={component.key as StandardId}
          rule={rule}
          standardName={component.name}
          backHref={componentEntryHref(searchParams)}
          tab={selectRuleTab(searchParams.get(TAB_PARAM))}
          onTabChange={showTab}
        />
      </PMBox>
    );
  }

  return (
    <>
      <ContextComponentDetail
        component={component}
        backLabel="All components"
        backHref={inventoryHref(searchParams)}
        ruleHref={(ruleId) => componentRuleHref(searchParams, ruleId)}
        /*
          No package on the edit link. It is what the form reads to come back to
          the package it was opened from, and there is none: the form returns to
          the inventory the same way this pane does.
        */
        editHref={componentEditHref(component, { orgSlug, spaceSlug })}
        tab={tab}
        onTabChange={showTab}
        orgSlug={orgSlug}
        spaceSlug={spaceSlug}
        moveLabel="Add to package"
        onMove={() => setAdding(true)}
        /*
          Nothing to remove it from. Not a disabled item, which would be an
          affordance promising something the state cannot honour.
        */
        onRemove={null}
        onDelete={() => setConfirmingDelete(true)}
      />

      {adding && (
        <MoveComponentDrawer
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setAdding(false);
          }}
          components={[component]}
          /*
            No source, the same way the inventory's own bar opens it. The add is
            the whole operation, and the drawer already words itself for that.
          */
          source={null}
          packages={packages}
          spaceId={spaceId}
          organizationId={organizationId}
          onCreatePackage={onCreatePackage}
          onMoved={() => setAdding(false)}
        />
      )}

      {/*
        Outside the detail above, like the package pane's: what it confirms
        stops existing the moment it is confirmed, and a dialog living inside
        the component would be unmounted by its own success.
      */}
      {confirmingDelete && (
        <PMAlertDialog
          title={`Delete ${label}`}
          message={`Delete “${component.name}”? It leaves the space. This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => void deleteThisComponent()}
          open
          onOpenChange={({ open }) => {
            if (!open) setConfirmingDelete(false);
          }}
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
