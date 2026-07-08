import React from 'react';
import {
  PMText,
  PMVStack,
  PMSpinner,
  PMHStack,
  PMField,
  PMCombobox,
  PMPortal,
  pmUseFilter,
  pmUseListCollection,
  PMBadge,
  PMCloseButton,
} from '@packmind/ui';
import { Link } from 'react-router';
import {
  Command,
  Standard,
  CommandId,
  StandardId,
  Skill,
  SkillId,
} from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';

interface PackageEditFormContentProps {
  allCommands: Command[];
  allStandards: Standard[];
  allSkills: Skill[];
  selectedCommandIds: CommandId[];
  selectedStandardIds: StandardId[];
  selectedSkillIds: SkillId[];
  setSelectedCommandIds: (ids: CommandId[]) => void;
  setSelectedStandardIds: (ids: StandardId[]) => void;
  setSelectedSkillIds: (ids: SkillId[]) => void;
  isPending: boolean;
  isLoadingCommands: boolean;
  isLoadingStandards: boolean;
  isLoadingSkills: boolean;
  orgSlug: string;
  spaceSlug: string;
}

export const PackageEditFormContent = ({
  allCommands,
  allStandards,
  allSkills,
  selectedCommandIds,
  selectedStandardIds,
  selectedSkillIds,
  setSelectedCommandIds,
  setSelectedStandardIds,
  setSelectedSkillIds,
  isPending,
  isLoadingCommands,
  isLoadingStandards,
  isLoadingSkills,
  orgSlug,
  spaceSlug,
}: PackageEditFormContentProps) => {
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const commandItems = allCommands.map((recipe: Command) => ({
    label: recipe.name,
    value: recipe.id,
  }));

  const standardItems = allStandards.map((standard: Standard) => ({
    label: standard.name,
    value: standard.id,
  }));

  const skillItems = allSkills.map((skill: Skill) => ({
    label: skill.name,
    value: skill.id,
  }));

  const { collection: commandCollection, filter: filterCommands } =
    pmUseListCollection({
      initialItems: commandItems,
      filter: contains,
    });

  const { collection: standardCollection, filter: filterStandards } =
    pmUseListCollection({
      initialItems: standardItems,
      filter: contains,
    });

  const { collection: skillCollection, filter: filterSkills } =
    pmUseListCollection({
      initialItems: skillItems,
      filter: contains,
    });

  const commandDisplayValue =
    selectedCommandIds.length === 0
      ? 'Select commands...'
      : `${selectedCommandIds.length} command(s) selected`;

  const standardDisplayValue =
    selectedStandardIds.length === 0
      ? 'Select standards...'
      : `${selectedStandardIds.length} standard(s) selected`;

  const skillDisplayValue =
    selectedSkillIds.length === 0
      ? 'Select skills...'
      : `${selectedSkillIds.length} skill(s) selected`;

  return (
    <PMHStack align="flex-start" gap={4} width="full">
      <PMField.Root flex={1} width="full">
        <PMField.Label>Standards</PMField.Label>
        {isLoadingStandards || allStandards.length === 0 ? (
          isLoadingStandards ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No standards available in this space
            </PMText>
          )
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={standardCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterStandards(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedStandardIds(details.value as StandardId[])
              }
              value={selectedStandardIds}
              multiple
              openOnClick
              placeholder={standardDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No standards found</PMCombobox.Empty>
                    {standardCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedStandardIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedStandardIds
                  .map((standardId) => {
                    const standard = allStandards.find(
                      (s) => s.id === standardId,
                    );
                    return standard
                      ? { id: standardId, name: standard.name }
                      : null;
                  })
                  .filter(
                    (item): item is { id: StandardId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <Link
                        to={routes.space.toStandard(orgSlug, spaceSlug, id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <PMText truncate title={name}>
                          {name}
                        </PMText>
                      </Link>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedStandardIds(
                            selectedStandardIds.filter(
                              (standardId) => standardId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>

      <PMField.Root flex={1} width="full">
        <PMField.Label>Commands</PMField.Label>
        {isLoadingCommands || allCommands.length === 0 ? (
          isLoadingCommands ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No commands available in this space
            </PMText>
          )
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={commandCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterCommands(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedCommandIds(details.value as CommandId[])
              }
              value={selectedCommandIds}
              multiple
              openOnClick
              placeholder={commandDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No commands found</PMCombobox.Empty>
                    {commandCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedCommandIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedCommandIds
                  .map((recipeId) => {
                    const recipe = allCommands.find((r) => r.id === recipeId);
                    return recipe ? { id: recipeId, name: recipe.name } : null;
                  })
                  .filter(
                    (item): item is { id: CommandId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <Link
                        to={routes.space.toCommand(orgSlug, spaceSlug, id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <PMText truncate title={name}>
                          {name}
                        </PMText>
                      </Link>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedCommandIds(
                            selectedCommandIds.filter(
                              (recipeId) => recipeId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>

      <PMField.Root flex={1} width="full">
        <PMField.Label>Skills</PMField.Label>
        {isLoadingSkills || allSkills.length === 0 ? (
          isLoadingSkills ? (
            <PMSpinner size="sm" />
          ) : (
            <PMText colorPalette="gray" fontSize="sm" display="block">
              No skills available in this space
            </PMText>
          )
        ) : (
          <PMVStack gap={2} width="full" align="flex-start">
            <PMCombobox.Root
              collection={skillCollection}
              onInputValueChange={(e: { inputValue: string }) =>
                filterSkills(e.inputValue)
              }
              onValueChange={(details: { value: string[] }) =>
                setSelectedSkillIds(details.value as SkillId[])
              }
              value={selectedSkillIds}
              multiple
              openOnClick
              placeholder={skillDisplayValue}
              width="full"
              disabled={isPending}
            >
              <PMCombobox.Control>
                <PMVStack gap={0} width="full">
                  <PMCombobox.Input />
                  <PMCombobox.IndicatorGroup>
                    <PMCombobox.ClearTrigger />
                    <PMCombobox.Trigger />
                  </PMCombobox.IndicatorGroup>
                </PMVStack>
              </PMCombobox.Control>

              <PMPortal>
                <PMCombobox.Positioner>
                  <PMCombobox.Content>
                    <PMCombobox.Empty>No skills found</PMCombobox.Empty>
                    {skillCollection.items.map((item) => (
                      <PMCombobox.Item item={item} key={item.value}>
                        <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                        <PMCombobox.ItemIndicator />
                      </PMCombobox.Item>
                    ))}
                  </PMCombobox.Content>
                </PMCombobox.Positioner>
              </PMPortal>
            </PMCombobox.Root>

            {selectedSkillIds.length > 0 && (
              <PMHStack gap={2} flexWrap="wrap" width="full">
                {selectedSkillIds
                  .map((skillId) => {
                    const skill = allSkills.find((s) => s.id === skillId);
                    return skill ? { id: skillId, name: skill.name } : null;
                  })
                  .filter(
                    (item): item is { id: SkillId; name: string } =>
                      item !== null,
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(({ id, name }) => (
                    <PMBadge
                      key={id}
                      variant="subtle"
                      maxW="300px"
                      display="inline-flex"
                      alignItems="center"
                    >
                      <PMText truncate title={name}>
                        {name}
                      </PMText>
                      <PMCloseButton
                        size="xs"
                        ml={1}
                        flexShrink={0}
                        onClick={() =>
                          setSelectedSkillIds(
                            selectedSkillIds.filter(
                              (skillId) => skillId !== id,
                            ),
                          )
                        }
                        disabled={isPending}
                      />
                    </PMBadge>
                  ))}
              </PMHStack>
            )}
          </PMVStack>
        )}
        <PMField.HelperText />
        <PMField.ErrorText />
      </PMField.Root>
    </PMHStack>
  );
};
