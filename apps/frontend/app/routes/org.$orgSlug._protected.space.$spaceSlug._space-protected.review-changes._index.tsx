import { PMBox, PMText } from '@packmind/ui';

export default function ReviewChangesIndexRouteModule() {
  return (
    <PMBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="300px"
      gridColumn="span 2"
    >
      <PMText fontSize="md">
        Select an artefact to review in the left panel
      </PMText>
    </PMBox>
  );
}
